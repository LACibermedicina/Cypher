import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supportedLanguages } from '@/i18n/config';

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Use resolved language and handle region codes (e.g., pt-BR -> pt)
  const normalizedLanguage = (i18n.resolvedLanguage || i18n.language).split('-')[0];
  const currentLanguage = supportedLanguages[normalizedLanguage as keyof typeof supportedLanguages] || supportedLanguages.pt;

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      setIsOpen(false);
      // Note: i18next will automatically handle localStorage with our config
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-10 h-10 flex items-center justify-center hover:bg-accent hover:text-accent-foreground"
          data-testid="language-selector-trigger"
        >
          <span className="text-xl" role="img" aria-label={`${currentLanguage.name} flag`}>
            {currentLanguage.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(supportedLanguages).map(([code, language]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code)}
            className={`flex items-center space-x-3 cursor-pointer ${
              normalizedLanguage === code 
                ? 'bg-accent text-accent-foreground font-medium' 
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
            data-testid={`language-option-${code}`}
          >
            <span className="text-lg" role="img" aria-label={`${language.name} flag`}>
              {language.flag}
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium">{language.nativeName}</div>
              <div className="text-xs text-muted-foreground">{language.name}</div>
            </div>
            {normalizedLanguage === code && (
              <i className="fas fa-check text-primary text-sm" aria-hidden="true"></i>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}