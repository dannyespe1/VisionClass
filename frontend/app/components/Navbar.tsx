"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/app/ui/button";

interface NavbarProps {
  onNavigateToLogin: () => void;
}

export function Navbar({ onNavigateToLogin }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setIsMobileMenuOpen(false);
      return;
    }
    router.push(`/#${id}`);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-sm shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection("inicio")}>
            <div className="w-12 h-12 rounded-lg bg-white p-1 flex items-center justify-center">
              <img src="/LOGO1.png" alt="VisionClass" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl text-gray-900">VisionClass</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("inicio")}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Inicio
            </button>
            <button
              onClick={() => scrollToSection("nosotros")}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Nosotros
            </button>
            <button
              onClick={() => scrollToSection("contacto")}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Contacto
            </button>
            <Button size="sm" onClick={onNavigateToLogin}>Iniciar Sesión</Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-900" />
            ) : (
              <Menu className="w-6 h-6 text-gray-900" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-4 space-y-3">
            <button
              onClick={() => scrollToSection("inicio")}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Inicio
            </button>
            <button
              onClick={() => scrollToSection("nosotros")}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Nosotros
            </button>
            <button
              onClick={() => scrollToSection("contacto")}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Contacto
            </button>
            <Button className="w-full" onClick={onNavigateToLogin}>Iniciar Sesión</Button>
          </div>
        </div>
      )}
    </nav>
  );
}
