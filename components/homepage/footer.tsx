import { useTranslations } from 'next-intl';

const Footer = () => {
  const t = useTranslations('Home');
  return (
    <footer className="px-4 pb-8 pt-2 text-center">
      <p className="text-xs text-muted-foreground">
        {t('footer')}
      </p>
    </footer>
  );
};

export default Footer;
