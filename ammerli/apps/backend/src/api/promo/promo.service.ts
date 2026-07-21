import { Injectable } from '@nestjs/common';

export interface PromoOffer {
  id: string | number;
  title: string;
  description?: string;
  subtitle?: string;
  icon?: string;
  discountPercent?: number;
  expiresAt?: string;
}

@Injectable()
export class PromoService {
  getPromos(): PromoOffer[] {
    return [
      {
        id: '1',
        title: 'خصم 10% على مياه الآبار',
        description: 'استخدم الكود عند الدفع',
        subtitle: 'صالح لمدة أسبوع',
        icon: 'percent',
        discountPercent: 10,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        title: 'توصيل مجاني للطلبات الكبيرة',
        description: 'للطلبات أكثر من 5 صهاريج',
        subtitle: 'عرض حصري',
        icon: 'truck',
        discountPercent: 100,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  applyPromo(code: string) {
    return { success: true, message: 'Promo applied successfully (Mock)', code };
  }

  usePromo(promoId: string) {
    return { success: true, message: 'Promo used successfully (Mock)', promoId };
  }
}
