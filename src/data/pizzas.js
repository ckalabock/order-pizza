import margImage from "../pages/pic/marg.avif";
import pepperoniImage from "../pages/pic/pipi.avif";
import fourCheeseImage from "../pages/pic/sir.avif";
import bbqImage from "../pages/pic/bbq.avif";
import hawaiiImage from "../pages/pic/gav.avif";
import tunaImage from "../pages/pic/tunec.avif";

export const PIZZAS = [
  {
    id: "margherita",
    name: "Маргарита",
    description: "Классическая пицца с томатным соусом, моцареллой и базиликом",
    basePrice: 450,
    category: "classic",
    image: margImage
  },
  {
    id: "pepperoni",
    name: "Пепперони",
    description: "Острая пицца с пикантной колбасой пепперони и сыром",
    basePrice: 550,
    category: "meat",
    image: pepperoniImage
  },
  {
    id: "four_cheese",
    name: "Четыре сыра",
    description: "Изысканное сочетание четырех видов сыра",
    basePrice: 600,
    category: "veg",
    image: fourCheeseImage
  },
  {
    id: "bbq",
    name: "BBQ",
    description: "Курица, BBQ соус, лук, моцарелла",
    basePrice: 620,
    category: "meat",
    image: bbqImage
  },
  {
    id: "hawaii",
    name: "Гавайская",
    description: "Ветчина, ананас, моцарелла, соус",
    basePrice: 590,
    category: "classic",
    image: hawaiiImage
  },
  {
    id: "tuna",
    name: "Тунец",
    description: "Тунец, лук, сыр, соус",
    basePrice: 650,
    category: "fish",
    image: tunaImage
  }
];
