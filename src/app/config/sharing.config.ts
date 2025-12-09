export interface ShareOption {
    name: string;
    icon: string;
    color: string;
    shareUrl: (url: string, title: string) => string;
  }
  
  export const shareOptions: ShareOption[] = [
    {
      name: 'EMAIL',
      icon: 'bi bi-envelope',
      color: '#EA4335',
      shareUrl: (url, title) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
    },
    {
      name: 'FACEBOOK',
      icon: 'bi bi-facebook',
      color: '#3b5998',
      shareUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    },
    {
      name: 'WHATSAPP',
      icon: 'bi bi-whatsapp',
      color: '#25D366',
      shareUrl: (url, title) => `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`
    },
    {
      name: 'X',
      icon: 'bi bi-twitter-x',
      color: '#000000',
      shareUrl: (url, title) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    },
    {
      name: 'TELEGRAM',
      icon: 'bi bi-telegram',
      color: '#0088cc',
      shareUrl: (url, title) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
    },
    {
      name: 'PRINT',
      icon: 'bi bi-printer',
      color: '#000000',
      shareUrl: () => 'print'
    }
  ];