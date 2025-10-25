import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface TermsDialogProps {
  open: boolean;
  onAccept: (dontShowAgain: boolean) => void;
  onDecline: () => void;
}

const TermsDialog: React.FC<TermsDialogProps> = ({ open, onAccept, onDecline }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!open) {
      setHasScrolledToBottom(false);
      setDontShowAgain(false);
    }
  }, [open]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const reachedBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    if (reachedBottom && !hasScrolledToBottom) setHasScrolledToBottom(true);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Terms and Conditions</DialogTitle>
          <DialogDescription>
            Please scroll through the complete terms before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto pr-4 max-h-[55vh] border rounded-md p-3"
          onScroll={handleScroll}
        >
          <div className="space-y-4 text-sm">
            {/* --- Terms sections --- */}
            <section>
              <h3 className="font-semibold text-base mb-2">1. Acceptance of Terms</h3>
              <p className="text-muted-foreground">
                By accessing and using OASYS (Optimal Attendance SYStem), you accept and agree to be bound by these terms and conditions.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">2. Service Description</h3>
              <p className="text-muted-foreground">
                OASYS is an unofficial attendance tracking tool designed for SRM Ramapuram Students. It provides attendance statistics, visualizations, and planning features to help students manage their attendance requirements.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">3. Credential Handling</h3>
              <p className="text-muted-foreground">
                Your SRM credentials (NetID and Password) are used solely to fetch your attendance data from the official SRM portal. We DO NOT store, save, or transmit your credentials to any third-party servers.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">4. Data Privacy</h3>
              <p className="text-muted-foreground">
                We do not collect, store, or share any personal information or attendance records with third parties.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">5. Unofficial Service</h3>
              <p className="text-muted-foreground">
                OASYS is NOT affiliated with, endorsed by, or officially connected to SRMIST in any way.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">6. Accuracy Disclaimer</h3>
              <p className="text-muted-foreground">
                While we strive for accuracy, OASYS provides attendance information "as is" without any guarantees. Always verify critical attendance information with official SRM sources.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">7. User Responsibility</h3>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your SRM credentials and using this service in compliance with university policies.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">8. Service Availability</h3>
              <p className="text-muted-foreground">
                We do not guarantee uninterrupted or error-free service. We reserve the right to modify or discontinue the service at any time.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">9. Limitation of Liability</h3>
              <p className="text-muted-foreground">
                The creators of OASYS shall not be liable for any damages arising from your use of this service, including academic consequences from attendance miscalculations.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">10. Limitation of Responsibility</h3>
              <p className="text-muted-foreground">
                We are not liable for any misuse of the application, unauthorized access, or credential-related incidents. By using this application, you acknowledge that you do so at your own risk.
              </p>
            </section>

            <div className="pt-4 pb-2 text-center text-muted-foreground border-t">
              <p className="text-xs">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {!hasScrolledToBottom && (
          <p className="text-sm text-muted-foreground text-center animate-pulse mt-2">
            Please scroll to the bottom to continue
          </p>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <div className="flex items-center space-x-2 mr-auto">
            <Checkbox
              id="dontShow"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(!!checked)}
              disabled={!hasScrolledToBottom}
            />
            <label
              htmlFor="dontShow"
              className={`text-sm cursor-pointer ${!hasScrolledToBottom ? 'opacity-50' : ''}`}
            >
              Don’t show this again
            </label>
          </div>

          <Button variant="outline" onClick={onDecline}>
            Decline
          </Button>
          <Button onClick={() => onAccept(dontShowAgain)} disabled={!hasScrolledToBottom}>
            I Agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsDialog;
