import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-lg">Last updated: January 2026</p>
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">1. What Are Cookies</h2>
              <p>Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">2. How We Use Cookies</h2>
              <p>We use cookies to keep you signed in, remember your preferences, and analyze how you use our service to improve it.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">3. Managing Cookies</h2>
              <p>You can control and manage cookies through your browser settings. However, disabling cookies may affect some features of LinkedBot.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicy;
