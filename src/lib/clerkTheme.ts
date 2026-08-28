// Tema de Clerk alineado al sistema de diseño del producto.
// Compartido por las páginas de inicio de sesión y registro.
export const clerkAppearance = {
  variables: {
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    colorPrimary: '#1E5AA8',
    colorPrimaryHover: '#174A8C',
    colorBackground: '#FFFFFF',
    colorText: '#1A2332',
    colorTextSecondary: '#4A5568',
    colorMuted: '#F6F8FB',
    colorInputBackground: '#FFFFFF',
    colorInputText: '#1A2332',
    borderRadius: '6px',
  },
  elements: {
    card: {
      border: '1px solid #D9E0EA',
      boxShadow: 'none',
      borderRadius: '10px',
    },
    socialButtonsBlockButton: {
      border: '1px solid #D9E0EA',
      borderRadius: '6px',
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    },
    formButtonPrimary: {
      background: '#1E5AA8',
      borderRadius: '6px',
      fontWeight: 600,
    },
    formFieldInput: {
      border: '1px solid #D9E0EA',
      borderRadius: '6px',
      boxShadow: 'none',
    },
    footerActionLink: {
      color: '#1E5AA8',
      fontWeight: 500,
    },
  },
};
