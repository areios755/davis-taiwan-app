export interface Review {
  author: string;
  shop: string;
  rating: number;
  text: string;
  date: string;
}

/** Only a subset of products have reviews — keeps it authentic */
export const PRODUCT_REVIEWS: Record<string, Review[]> = {
  degrease_pretreat: [
    { author: '陳美容師', shop: '台北', rating: 5, text: '貓咪油尾巴救星，洗完乾爽蓬鬆，客人都很滿意', date: '2025-12' },
  ],
  humid_oil_control: [
    { author: '林老師', shop: '台中', rating: 5, text: '草本香味持久，吹完光澤度很好，客人會主動問用什麼洗的', date: '2026-01' },
    { author: '王美容師', shop: '高雄', rating: 4, text: '稀釋比例高很省，泡沫細緻好沖洗', date: '2025-11' },
  ],
  detangling: [
    { author: '張美容師', shop: '新竹', rating: 5, text: '馬爾濟斯長毛打結剋星，洗完梳毛順到不行', date: '2026-02' },
  ],
  white_coat_brighten: [
    { author: '李老師', shop: '桃園', rating: 4, text: '紅貴賓用了三次毛色明顯變深，要持續用才有效果', date: '2025-10' },
  ],
  oatmeal_gentle_clean: [
    { author: '黃美容師', shop: '台南', rating: 5, text: '敏感肌法鬥洗這個完全不會紅，很溫和', date: '2026-01' },
  ],
  deshed_dog: [
    { author: '周美容師', shop: '台北', rating: 4, text: '換毛季金毛用這個掉毛量少很多，客人超感謝', date: '2025-09' },
  ],
};
