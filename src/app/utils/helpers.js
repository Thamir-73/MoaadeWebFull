export const translateMaterialType = (materialType, language = 'en') => {
    const translations = {
      'plastic': {
        ar: 'بلاستيك',
        en: 'Plastic'
      },
      'glass': {
        ar: 'زجاج',
        en: 'Glass'
      },
      'paper': {
        ar: 'ورق',
        en: 'Paper'
      },
      'paperAndCardboard': {
        ar: 'ورق وكرتون',
        en: 'Paper & Cardboard'
      },
      'organicMaterial': {
        ar: 'مواد عضوية',
        en: 'Organic Material'
      },
      'other': {
        ar: 'مواد أخرى',
        en: 'Other'
      }
    };
    
    return translations[materialType]?.[language] || materialType;
  };