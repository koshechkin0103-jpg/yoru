// Товары: страница товара (product.html?id=…) и корзина (cart.html) берут данные отсюда.
// Фото — те же вырезанные куртки, что в блоках «Models» и «Collections».

// версии папок с фото (проставляет tools/stamp.pl — кэш браузера сбрасывается при замене фото)
const LOTS = { v: 'b2ad8fa5', // stamp-dir:img/lots
};
const CARDS = { v: '98feacbd', // stamp-dir:img/cards
};

const photos = (dir, v, slug, alts) => alts.map((alt, i) => ({ src: `img/${dir}/${slug}-${i + 1}.webp?v=${v}`, alt }));

export const SIZES = ['S', 'M', 'L', 'XL'];

export const PRODUCTS = {
  hanazaru: {
    name: 'HANAZARU',
    num: '01',
    price: 890,
    desc: 'Two macaques, one branch. Stitched by direction, not color – fur catches light, petals never land.',
    photos: photos('lots', LOTS.v, 'hanazaru', [
      'Hanazaru sukajan, open — both sides visible',
      'Hanazaru, cream side, front',
      'Hanazaru, cream side, back',
      'Hanazaru, pink side, front',
      'Hanazaru, pink side, back',
    ]),
  },
  sumiryu: {
    name: 'SUMIRYU',
    num: '02',
    price: 690,
    desc: 'Ink dragon, red moon. Drawn in thread, not paint – one brush stroke, ten thousand stitches.',
    photos: photos('lots', LOTS.v, 'sumiryu', [
      'Sumiryu sukajan, open — both sides visible',
      'Sumiryu, black side, front',
      'Sumiryu, black side, back',
      'Sumiryu, green side, front',
      'Sumiryu, green side, back',
    ]),
  },
  'dragon-carp': {
    name: 'DRAGON CARP',
    num: '01',
    price: 890,
    desc: 'The carp climbs the falls, the dragon waits at the top. Red satin for the legend, sakura pink for the ending.',
    photos: photos('cards', CARDS.v, 'dragon-carp', [
      'Dragon Carp, red side, front',
      'Dragon Carp, red side, back',
      'Dragon Carp, pink side, front',
      'Dragon Carp, pink side, back',
    ]),
  },
  karigane: {
    name: 'KARIGANE',
    num: '02',
    price: 780,
    desc: 'Swallows by day, cranes by moonlight. Cream on one side, black on the other – one flight, two skies.',
    photos: photos('cards', CARDS.v, 'karigane', [
      'Karigane, cream side, front',
      'Karigane, cream side, back',
      'Karigane, black side, front',
      'Karigane, black side, back',
    ]),
  },
  onami: {
    name: 'ONAMI',
    num: '03',
    price: 790,
    desc: 'A great wave in front, a whale rising behind it. Turn it inside out – plum blossoms and one crane, still water.',
    photos: photos('cards', CARDS.v, 'onami', [
      'Onami, wave side, front',
      'Onami, wave side, back',
      'Onami, blossom side, front',
      'Onami, blossom side, back',
    ]),
  },
  byakko: {
    name: 'BYAKKO',
    num: '04',
    price: 590,
    desc: 'Twin wolves at the front, one more howling at the moon behind. Flip it – silver sleeves, a red moon, a white tiger.',
    photos: photos('cards', CARDS.v, 'byakko', [
      'Byakko, wolf side, front',
      'Byakko, wolf side, back',
      'Byakko, tiger side, front',
      'Byakko, tiger side, back',
    ]),
  },
};

export const money = (n) => `$${n.toLocaleString('en-US')}`;
