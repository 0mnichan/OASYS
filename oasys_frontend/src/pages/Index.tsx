import React, { useEffect, useState } from 'react';
import LoginForm from '@/components/LoginForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Github, Shield, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);
  
  return (
    <>
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Terms and Conditions</DialogTitle>
            <DialogDescription>
              Please read our terms and conditions
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] pr-4">
            <div className="space-y-4 text-sm">
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

              <section>
                <h3 className="font-semibold text-base mb-2">11. Changes to Terms</h3>
                <p className="text-muted-foreground">
                  We reserve the right to modify these terms at any time. Continued use constitutes acceptance of modified terms.
                </p>
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        {/* Theme Toggle */}
        <div className="fixed top-6 right-6 z-50 animate-fade-in">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-4xl mx-auto px-4 py-12 flex flex-col items-center relative z-10">
          <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="inline-flex items-center gap-2 mb-4">
              
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                OASYS
              </h1>
              
            </div>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-6">
              Optimal Attendance SYStem for SRM Ramapuram Students
            </p>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Never miss the 75% attendance requirement again.
            </p>
          </div>
          
          <div className="w-full max-w-md animate-fade-in mb-8" style={{ animationDelay: '0.3s' }}>
            <LoginForm />
          </div>
          
          <div className="flex flex-wrap gap-4 justify-center items-center text-sm animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTermsModal(true)}
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              Terms & Conditions
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-2"
            >
              <a href="https://github.com/yourusername/oasis" target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
            </Button>
          </div>

          <div className="mt-8 text-center text-xs text-muted-foreground animate-fade-in max-w-2xl" style={{ animationDelay: '0.6s' }}>
            <p className="flex items-center justify-center gap-1 mb-2">
              <Shield className="w-3 h-3" />
              Your credentials are only used to fetch attendance data and are never stored.
            </p>
            <p>This is an unofficial tool and is not affiliated with SRMIST or any other entity.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
