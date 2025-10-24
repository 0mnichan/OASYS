import React, { useState, useRef, useEffect } from 'react';
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
    const target = event.currentTarget;
    const bottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 10;
    if (bottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Terms and Conditions</DialogTitle>
          <DialogDescription>
            Please read through the complete terms before proceeding
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className="flex-1 overflow-y-auto pr-4 max-h-[50vh]" 
          onScroll={handleScroll}
        >
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-2">1. Acceptance of Terms</h3>
              <p className="text-muted-foreground">
                By accessing and using OASIS (Optimal Attendance System for SRM Students), you accept and agree to be bound by these terms and conditions.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">2. Service Description</h3>
              <p className="text-muted-foreground">
                OASIS is an unofficial attendance tracking tool designed for SRM University students. It provides attendance statistics, visualizations, and planning features to help students manage their attendance requirements.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">3. Credential Handling</h3>
              <p className="text-muted-foreground">
                Your SRM credentials (User ID and Password) are used solely to fetch your attendance data from the official SRM portal. We DO NOT store, save, or transmit your credentials to any third-party servers. All authentication happens directly between your browser and SRM's official systems.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">4. Data Privacy</h3>
              <p className="text-muted-foreground">
                Your attendance data is processed locally in your browser. We do not collect, store, or share any personal information or attendance records with third parties. Session data is stored temporarily in your browser's local storage.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">5. Unofficial Service</h3>
              <p className="text-muted-foreground">
                OASIS is NOT affiliated with, endorsed by, or officially connected to SRM University in any way. This is an independent tool created to assist students and should not be considered an official university service.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">6. Accuracy Disclaimer</h3>
              <p className="text-muted-foreground">
                While we strive for accuracy, OASIS provides attendance information "as is" without any guarantees. Always verify critical attendance information with official SRM sources. We are not responsible for any discrepancies or consequences arising from reliance on this tool.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">7. User Responsibility</h3>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your SRM credentials. You agree to use this service in compliance with all applicable university policies and regulations. The attendance planning features are for informational purposes only.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">8. Service Availability</h3>
              <p className="text-muted-foreground">
                We do not guarantee uninterrupted or error-free service. The service may be temporarily unavailable due to maintenance, updates, or issues with SRM's official portal. We reserve the right to modify or discontinue the service at any time.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">9. Limitation of Liability</h3>
              <p className="text-muted-foreground">
                The creators and maintainers of OASIS shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of this service. This includes, but is not limited to, academic consequences from attendance miscalculations.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">10. Changes to Terms</h3>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">11. Contact</h3>
              <p className="text-muted-foreground">
                For questions or concerns about these terms, please contact us through our GitHub repository.
              </p>
            </section>

            <div className="pt-4 pb-2 text-center text-muted-foreground border-t">
              <p className="text-xs">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {!hasScrolledToBottom && (
          <p className="text-sm text-muted-foreground text-center animate-pulse">
            Please scroll to the bottom to continue
          </p>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <div className="flex items-center space-x-2 mr-auto">
            <Checkbox
              id="dontShow"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              disabled={!hasScrolledToBottom}
            />
            <label
              htmlFor="dontShow"
              className={`text-sm cursor-pointer ${!hasScrolledToBottom ? 'opacity-50' : ''}`}
            >
              Don't show this again
            </label>
          </div>
          <Button
            variant="outline"
            onClick={onDecline}
          >
            Decline
          </Button>
          <Button
            onClick={() => onAccept(dontShowAgain)}
            disabled={!hasScrolledToBottom}
          >
            I Agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsDialog;
