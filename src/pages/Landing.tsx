import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { RolesSection } from '@/components/landing/RolesSection';
import { Footer } from '@/components/landing/Footer';
import { supabase } from '@/integrations/supabase/client';
export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <RolesSection />
      </main>
      <Footer />
    </div>
  );
}
