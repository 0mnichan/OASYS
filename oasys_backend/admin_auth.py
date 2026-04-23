import os
import json
import base64
import secrets
import time
from pathlib import Path

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    ResidentKeyRequirement,
    PublicKeyCredentialDescriptor,
    RegistrationCredential,
    AuthenticatorAttestationResponse,
    AuthenticationCredential,
    AuthenticatorAssertionResponse,
)

RP_ID = os.environ.get("WEBAUTHN_RP_ID", "localhost")
RP_NAME = "OASYS Admin"
ORIGIN = os.environ.get("WEBAUTHN_ORIGIN", "http://localhost:8000")

CREDENTIAL_FILE = Path(__file__).parent / ".admin_credential.json"

_pending_reg_challenge: bytes | None = None
_pending_auth_challenge: bytes | None = None

_admin_sessions: dict[str, float] = {}
SESSION_TTL = 8 * 3600  # 8 hours


def _b64url_decode(s: str) -> bytes:
    s = s.replace("-", "+").replace("_", "/")
    return base64.b64decode(s + "=" * (-len(s) % 4))


def credential_registered() -> bool:
    return CREDENTIAL_FILE.exists()


def _load_credential() -> dict | None:
    if not CREDENTIAL_FILE.exists():
        return None
    try:
        with open(CREDENTIAL_FILE) as f:
            return json.load(f)
    except Exception:
        return None


def _save_credential(credential_id: bytes, public_key: bytes, sign_count: int) -> None:
    with open(CREDENTIAL_FILE, "w") as f:
        json.dump({
            "credential_id": base64.b64encode(credential_id).decode(),
            "public_key": base64.b64encode(public_key).decode(),
            "sign_count": sign_count,
        }, f)
    print("[Admin] Passkey registered and saved.")


def registration_options_json() -> str:
    global _pending_reg_challenge
    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=b"oasys-admin",
        user_name="admin",
        user_display_name="OASYS Admin",
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.REQUIRED,
            resident_key=ResidentKeyRequirement.REQUIRED,
        ),
    )
    _pending_reg_challenge = options.challenge
    return options_to_json(options)


def complete_registration(body: dict) -> bool:
    global _pending_reg_challenge
    if not _pending_reg_challenge:
        return False
    try:
        credential = RegistrationCredential(
            id=body["id"],
            raw_id=_b64url_decode(body["rawId"]),
            response=AuthenticatorAttestationResponse(
                client_data_json=_b64url_decode(body["response"]["clientDataJSON"]),
                attestation_object=_b64url_decode(body["response"]["attestationObject"]),
            ),
            type="public-key",
        )
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=_pending_reg_challenge,
            expected_rp_id=RP_ID,
            expected_origin=ORIGIN,
        )
        _save_credential(
            credential_id=verification.credential_id,
            public_key=verification.credential_public_key,
            sign_count=verification.sign_count,
        )
        _pending_reg_challenge = None
        return True
    except Exception as e:
        print(f"[Admin] Registration failed: {e}")
        _pending_reg_challenge = None
        return False


def authentication_options_json() -> str:
    global _pending_auth_challenge
    cred = _load_credential()
    allow_creds = []
    if cred:
        allow_creds = [PublicKeyCredentialDescriptor(
            id=base64.b64decode(cred["credential_id"]),
        )]
    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=allow_creds,
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    _pending_auth_challenge = options.challenge
    return options_to_json(options)


def complete_authentication(body: dict) -> bool:
    global _pending_auth_challenge
    if not _pending_auth_challenge:
        return False
    cred = _load_credential()
    if not cred:
        return False
    try:
        user_handle = body["response"].get("userHandle")
        credential = AuthenticationCredential(
            id=body["id"],
            raw_id=_b64url_decode(body["rawId"]),
            response=AuthenticatorAssertionResponse(
                client_data_json=_b64url_decode(body["response"]["clientDataJSON"]),
                authenticator_data=_b64url_decode(body["response"]["authenticatorData"]),
                signature=_b64url_decode(body["response"]["signature"]),
                user_handle=_b64url_decode(user_handle) if user_handle else None,
            ),
            type="public-key",
        )
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=_pending_auth_challenge,
            expected_rp_id=RP_ID,
            expected_origin=ORIGIN,
            credential_public_key=base64.b64decode(cred["public_key"]),
            credential_current_sign_count=cred["sign_count"],
        )
        cred["sign_count"] = verification.new_sign_count
        with open(CREDENTIAL_FILE, "w") as f:
            json.dump(cred, f)
        _pending_auth_challenge = None
        return True
    except Exception as e:
        print(f"[Admin] Authentication failed: {e}")
        _pending_auth_challenge = None
        return False


def create_session() -> str:
    token = secrets.token_urlsafe(32)
    _admin_sessions[token] = time.time() + SESSION_TTL
    return token


def validate_session(token: str | None) -> bool:
    if not token:
        return False
    expiry = _admin_sessions.get(token)
    if not expiry:
        return False
    if time.time() > expiry:
        _admin_sessions.pop(token, None)
        return False
    return True
