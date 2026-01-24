import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const GDPR = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">GDPR Compliance</h1>
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-lg">Last updated: January 2026</p>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Your Rights Under GDPR</h2>
              <p>If you are a resident of the European Economic Area (EEA), you have certain data protection rights under the General Data Protection Regulation.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Right to Access</h2>
              <p>You have the right to request copies of your personal data that we hold.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Right to Rectification</h2>
              <p>You have the right to request that we correct any information you believe is inaccurate or incomplete.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Right to Erasure</h2>
              <p>You have the right to request that we erase your personal data, under certain conditions.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Data Protection Officer</h2>
              <p>For any GDPR-related inquiries, contact our Data Protection Officer at dpo@linkedbot.com</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GDPR;
