import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';

export default function Footer() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const productLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Plaza', path: '/plaza' },
    { label: 'Chat', path: '/chat' },
    { label: 'Memory', path: '/memory' },
  ];

  const resourceLinks = [
    { label: 'Help Center', path: '#' },
    { label: 'Privacy', path: '#' },
    { label: 'Terms', path: '#' },
    { label: 'Crowdfunding', path: '/crowdfunding' },
  ];

  return (
    <footer className="bg-sidebar-bg text-sidebar-text">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1: Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-pink-200" />
              <span className="text-pink-200 text-lg font-bold">Corolas | Platonic</span>
            </div>
            <p className="text-sm text-sidebar-text/80 leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Col 2: Product links */}
          <div className="flex flex-col gap-3">
            <h4 className="text-pink text-sm font-semibold mb-1">Product</h4>
            {productLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.path)}
                className="text-left text-sm text-sidebar-text hover:text-white transition-colors duration-150"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Col 3: Resources */}
          <div className="flex flex-col gap-3">
            <h4 className="text-pink text-sm font-semibold mb-1">Resources</h4>
            {resourceLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => link.path !== '#' && navigate(link.path)}
                className="text-left text-sm text-sidebar-text hover:text-white transition-colors duration-150"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Col 4: Contact */}
          <div className="flex flex-col gap-3">
            <h4 className="text-pink text-sm font-semibold mb-1">Contact Us</h4>
            <a
              href="mailto:corolar@corolas.top"
              className="text-sm text-sidebar-text/80 hover:text-pink-200 transition-colors"
            >
              corolar@corolas.top
            </a>
            <div className="flex gap-3 mt-1">
              {/* Social placeholder icons */}
              <a href="https://x.com/Corolas247581" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-sidebar-hover flex items-center justify-center text-sidebar-icon hover:text-pink-200 hover:bg-sidebar-active transition-all duration-150 cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-sidebar-hover flex items-center justify-center text-sidebar-icon hover:text-pink-200 hover:bg-sidebar-active transition-all duration-150 cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-sidebar-hover flex items-center justify-center text-sidebar-icon hover:text-pink-200 hover:bg-sidebar-active transition-all duration-150 cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-sidebar-hover">
          <p className="text-center text-xs text-sidebar-text/60">
            &copy; 2026 Corolas | Platonic. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
