import React, { useEffect, useState } from 'react';
import LoginForm from '@/components/LoginForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Github, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import TermsDialog from "@/components/TermsDialog";

const Index = () => {
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    document.body.classList.add('landing-page');
    const accepted = localStorage.getItem("oasys_terms_accepted");
    if (!accepted) setShowTermsModal(true);
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);

  const handleAccept = (dontShowAgain: boolean) => {
    if (dontShowAgain) localStorage.setItem("oasys_terms_accepted", "true");
    setShowTermsModal(false);
  };

  const handleDecline = () => {
    alert("You must agree to the Terms and Conditions to use OASYS.");
    window.location.href = "https://oasys-omxb.onrender.com/";
  };

  return (
    <>
      <TermsDialog
        open={showTermsModal}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />

      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>

        <div className="fixed top-6 right-6 z-50 animate-fade-in">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-4xl mx-auto px-4 py-12 flex flex-col items-center relative z-10">
          <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              OASYS
            </h1>
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
            <Button variant="ghost" size="sm" onClick={() => setShowTermsModal(true)} className="gap-2">
              <Shield className="w-4 h-4" />
              Terms & Conditions
            </Button>
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <a href="https://github.com/0mnichan/OASYS.git" target="_blank" rel="noopener noreferrer">
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
