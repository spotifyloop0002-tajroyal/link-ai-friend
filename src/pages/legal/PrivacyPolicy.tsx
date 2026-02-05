import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Database, Key, Users, HardDrive, Mail } from "lucide-react";

const PrivacyPolicy = () => {
  usePageTitle("Privacy Policy");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Privacy Policy for LinkedBot</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              LinkedBot is a browser extension designed to assist users with LinkedIn post scheduling through user-initiated actions.
            </p>
            <p className="text-sm text-muted-foreground mt-4">Last updated: February 2026</p>
          </div>

          <div className="space-y-6">
            {/* Data Collection */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Database className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">Data Collection</h2>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>LinkedBot does <strong className="text-foreground">not</strong> collect, store, or transmit any personal data.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>No login credentials, messages, or LinkedIn account information are stored or shared.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions Usage */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">Permissions Usage</h2>
                    <p className="text-muted-foreground">
                      All permissions are used only to enable core functionality within LinkedIn when the user explicitly interacts with the extension.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Third-Party Sharing */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">Third-Party Sharing</h2>
                    <p className="text-muted-foreground">
                      LinkedBot does <strong className="text-foreground">not</strong> sell, rent, or share user data with third parties.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Local Storage */}
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <HardDrive className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">Local Storage</h2>
                    <p className="text-muted-foreground">
                      Any temporary data is stored locally in the user's browser and can be cleared at any time by uninstalling the extension.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="border-border/50 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">Contact</h2>
                    <p className="text-muted-foreground">
                      For any questions, please contact:{" "}
                      <a href="mailto:privacy@linkedbot.com" className="text-primary hover:underline">
                        privacy@linkedbot.com
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Box */}
          <div className="mt-12 p-6 rounded-xl bg-muted/50 border border-border/50 text-center">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Summary:</strong> LinkedBot respects your privacy. We don't collect your data, 
              we don't share your data, and we don't sell your data. It's that simple.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
