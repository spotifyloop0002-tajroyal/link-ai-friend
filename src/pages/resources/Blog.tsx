import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const posts = [
  {
    title: "10 Tips for LinkedIn Content That Converts",
    excerpt: "Learn the secrets to creating LinkedIn posts that drive engagement and generate leads.",
    date: "Jan 20, 2026",
    category: "Content Strategy",
  },
  {
    title: "The Future of AI in Professional Networking",
    excerpt: "How AI is transforming the way professionals connect and grow their networks.",
    date: "Jan 15, 2026",
    category: "Industry Trends",
  },
  {
    title: "Maximizing Your LinkedIn Posting Schedule",
    excerpt: "Discover the best times to post on LinkedIn for maximum visibility.",
    date: "Jan 10, 2026",
    category: "Tips & Tricks",
  },
];

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Blog</h1>
          <p className="text-muted-foreground mb-12">Insights, tips, and updates from the LinkedBot team.</p>
          
          <div className="space-y-8">
            {posts.map((post, index) => (
              <article 
                key={index}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer"
              >
                <span className="text-xs font-medium text-primary uppercase tracking-wider">{post.category}</span>
                <h2 className="text-2xl font-semibold mt-2 mb-3">{post.title}</h2>
                <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                <span className="text-sm text-muted-foreground">{post.date}</span>
              </article>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
