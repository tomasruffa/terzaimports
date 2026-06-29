import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import About from '@/components/landing/About'
import Products from '@/components/landing/Products'
import Services from '@/components/landing/Services'
import Contact from '@/components/landing/Contact'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Products />
      <About />
      <Services />
      <Contact />
      <Footer />
    </main>
  )
}
