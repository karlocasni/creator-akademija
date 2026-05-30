export interface MealIngredient {
  name: string;
  baseAmount: number;
  unit: string;
  macrosPer100: { p: number; c: number; f: number; kcal: number };
}

export interface Meal {
  name: string;
  ingredients: MealIngredient[];
}

export interface DietDay {
  day: string;
  meals: {
    dorucak: Meal;
    rucak: Meal;
    uzina: Meal;
    vecera: Meal;
  };
}

export const dietPlan: DietDay[] = [
  {
    day: 'Ponedjeljak',
    meals: {
      dorucak: {
        name: 'Zobena kaša s proteinima',
        ingredients: [
          { name: 'Zobene pahuljice', baseAmount: 60, unit: 'g', macrosPer100: { p: 13, c: 68, f: 7, kcal: 389 } },
          { name: 'Mlijeko', baseAmount: 200, unit: 'ml', macrosPer100: { p: 3.3, c: 4.8, f: 1.5, kcal: 47 } },
          { name: 'Whey protein', baseAmount: 30, unit: 'g', macrosPer100: { p: 75, c: 5, f: 5, kcal: 380 } },
          { name: 'Šumsko voće', baseAmount: 50, unit: 'g', macrosPer100: { p: 1, c: 10, f: 0, kcal: 40 } },
          { name: 'Kikiriki maslac', baseAmount: 15, unit: 'g', macrosPer100: { p: 25, c: 20, f: 50, kcal: 588 } },
        ]
      },
      rucak: {
        name: 'Piletina, krumpir i brokula',
        ingredients: [
          { name: 'Pileća prsa', baseAmount: 150, unit: 'g', macrosPer100: { p: 23, c: 0, f: 1.2, kcal: 110 } },
          { name: 'Krumpir', baseAmount: 200, unit: 'g', macrosPer100: { p: 2, c: 17, f: 0.1, kcal: 77 } },
          { name: 'Brokula', baseAmount: 100, unit: 'g', macrosPer100: { p: 2.8, c: 7, f: 0.4, kcal: 34 } },
        ]
      },
      uzina: {
        name: 'Posni sir i bademi',
        ingredients: [
          { name: 'Posni sir', baseAmount: 200, unit: 'g', macrosPer100: { p: 12, c: 3, f: 0.5, kcal: 70 } },
          { name: 'Bademi', baseAmount: 20, unit: 'g', macrosPer100: { p: 21, c: 22, f: 49, kcal: 579 } },
        ]
      },
      vecera: {
        name: 'Losos s batatom i brokulom',
        ingredients: [
          { name: 'Losos', baseAmount: 120, unit: 'g', macrosPer100: { p: 20, c: 0, f: 13, kcal: 208 } },
          { name: 'Batat', baseAmount: 150, unit: 'g', macrosPer100: { p: 1.6, c: 20, f: 0.1, kcal: 86 } },
          { name: 'Brokula', baseAmount: 100, unit: 'g', macrosPer100: { p: 2.8, c: 7, f: 0.4, kcal: 34 } },
          { name: 'Maslinovo ulje', baseAmount: 5, unit: 'g', macrosPer100: { p: 0, c: 0, f: 100, kcal: 884 } },
        ]
      }
    }
  },
  {
    day: 'Utorak',
    meals: {
      dorucak: {
        name: 'Jaja i integralni kruh',
        ingredients: [
          { name: 'Jaja', baseAmount: 3, unit: 'kom', macrosPer100: { p: 6, c: 0.6, f: 5, kcal: 72 } }, // Per 1 kom (1 egg)
          { name: 'Integralni kruh', baseAmount: 60, unit: 'g', macrosPer100: { p: 9, c: 43, f: 2, kcal: 240 } },
          { name: 'Puretina / Šunka', baseAmount: 50, unit: 'g', macrosPer100: { p: 18, c: 2, f: 3, kcal: 110 } },
          { name: 'Rajčica', baseAmount: 100, unit: 'g', macrosPer100: { p: 0.9, c: 3.9, f: 0.2, kcal: 18 } },
        ]
      },
      rucak: {
        name: 'Junetina s tjesteninom',
        ingredients: [
          { name: 'Mljevena junetina', baseAmount: 150, unit: 'g', macrosPer100: { p: 26, c: 0, f: 10, kcal: 200 } },
          { name: 'Integralna tjestenina', baseAmount: 80, unit: 'g', macrosPer100: { p: 13, c: 65, f: 2.5, kcal: 350 } },
          { name: 'Pasirana rajčica', baseAmount: 100, unit: 'ml', macrosPer100: { p: 1.5, c: 6, f: 0.2, kcal: 30 } },
          { name: 'Maslinovo ulje', baseAmount: 10, unit: 'g', macrosPer100: { p: 0, c: 0, f: 100, kcal: 884 } },
        ]
      },
      uzina: {
        name: 'Proteinski smoothie',
        ingredients: [
          { name: 'Banana', baseAmount: 100, unit: 'g', macrosPer100: { p: 1.1, c: 23, f: 0.3, kcal: 89 } },
          { name: 'Whey protein', baseAmount: 30, unit: 'g', macrosPer100: { p: 75, c: 5, f: 5, kcal: 380 } },
          { name: 'Zobene pahuljice', baseAmount: 30, unit: 'g', macrosPer100: { p: 13, c: 68, f: 7, kcal: 389 } },
          { name: 'Mlijeko', baseAmount: 200, unit: 'ml', macrosPer100: { p: 3.3, c: 4.8, f: 1.5, kcal: 47 } },
        ]
      },
      vecera: {
        name: 'Svježi sir i puretina',
        ingredients: [
          { name: 'Posni sir', baseAmount: 200, unit: 'g', macrosPer100: { p: 12, c: 3, f: 0.5, kcal: 70 } },
          { name: 'Pureća prsa', baseAmount: 100, unit: 'g', macrosPer100: { p: 24, c: 0, f: 1.5, kcal: 114 } },
          { name: 'Krastavci salata', baseAmount: 150, unit: 'g', macrosPer100: { p: 0.7, c: 3.6, f: 0.1, kcal: 15 } },
          { name: 'Maslinovo ulje', baseAmount: 10, unit: 'g', macrosPer100: { p: 0, c: 0, f: 100, kcal: 884 } },
        ]
      }
    }
  },
  {
    day: 'Srijeda',
    meals: {
      dorucak: {
        name: 'Proteinske palačinke',
        ingredients: [
          { name: 'Zobeno brašno', baseAmount: 50, unit: 'g', macrosPer100: { p: 13, c: 68, f: 7, kcal: 389 } },
          { name: 'Jaja', baseAmount: 2, unit: 'kom', macrosPer100: { p: 6, c: 0.6, f: 5, kcal: 72 } },
          { name: 'Whey protein', baseAmount: 20, unit: 'g', macrosPer100: { p: 75, c: 5, f: 5, kcal: 380 } },
          { name: 'Mlijeko', baseAmount: 100, unit: 'ml', macrosPer100: { p: 3.3, c: 4.8, f: 1.5, kcal: 47 } },
          { name: 'Šumsko voće', baseAmount: 50, unit: 'g', macrosPer100: { p: 1, c: 10, f: 0, kcal: 40 } },
        ]
      },
      rucak: {
        name: 'Piletina s krumpirom',
        ingredients: [
          { name: 'Pileća prsa', baseAmount: 150, unit: 'g', macrosPer100: { p: 23, c: 0, f: 1.2, kcal: 110 } },
          { name: 'Krumpir', baseAmount: 200, unit: 'g', macrosPer100: { p: 2, c: 17, f: 0.1, kcal: 77 } },
          { name: 'Zelena salata', baseAmount: 100, unit: 'g', macrosPer100: { p: 1.4, c: 2.9, f: 0.2, kcal: 15 } },
        ]
      },
      uzina: {
        name: 'Posni sir i maslac od kikirikija',
        ingredients: [
          { name: 'Posni sir', baseAmount: 200, unit: 'g', macrosPer100: { p: 12, c: 3, f: 0.5, kcal: 70 } },
          { name: 'Kikiriki maslac', baseAmount: 25, unit: 'g', macrosPer100: { p: 25, c: 20, f: 50, kcal: 588 } },
        ]
      },
      vecera: {
        name: 'Tuna salata',
        ingredients: [
          { name: 'Tuna u salamuri', baseAmount: 120, unit: 'g', macrosPer100: { p: 25, c: 0, f: 1, kcal: 110 } },
          { name: 'Salata i rajčica', baseAmount: 150, unit: 'g', macrosPer100: { p: 1, c: 3, f: 0, kcal: 16 } },
          { name: 'Maslinovo ulje', baseAmount: 10, unit: 'g', macrosPer100: { p: 0, c: 0, f: 100, kcal: 884 } },
        ]
      }
    }
  },
  {
    day: 'Četvrtak',
    meals: {
      dorucak: {
        name: 'Omlet s povrćem',
        ingredients: [
          { name: 'Jaja', baseAmount: 3, unit: 'kom', macrosPer100: { p: 6, c: 0.6, f: 5, kcal: 72 } },
          { name: 'Gljive i paprika', baseAmount: 100, unit: 'g', macrosPer100: { p: 2, c: 4, f: 0.3, kcal: 22 } },
          { name: 'Integralni kruh', baseAmount: 50, unit: 'g', macrosPer100: { p: 9, c: 43, f: 2, kcal: 240 } },
        ]
      },
      rucak: {
        name: 'Piletina s kus-kusom',
        ingredients: [
          { name: 'Pileća prsa', baseAmount: 150, unit: 'g', macrosPer100: { p: 23, c: 0, f: 1.2, kcal: 110 } },
          { name: 'Kus-kus', baseAmount: 80, unit: 'g', macrosPer100: { p: 12, c: 77, f: 2, kcal: 376 } },
          { name: 'Maslinovo ulje', baseAmount: 10, unit: 'g', macrosPer100: { p: 0, c: 0, f: 100, kcal: 884 } },
          { name: 'Povrće mix', baseAmount: 150, unit: 'g', macrosPer100: { p: 2, c: 6, f: 0.5, kcal: 35 } },
        ]
      },
      uzina: {
        name: 'Posni sir i kikiriki maslac',
        ingredients: [
          { name: 'Posni sir', baseAmount: 200, unit: 'g', macrosPer100: { p: 12, c: 3, f: 0.5, kcal: 70 } },
          { name: 'Kikiriki maslac', baseAmount: 20, unit: 'g', macrosPer100: { p: 25, c: 20, f: 50, kcal: 588 } },
        ]
      },
      vecera: {
        name: 'Tortilja s piletinom',
        ingredients: [
          { name: 'Integralna tortilja', baseAmount: 60, unit: 'g', macrosPer100: { p: 8, c: 50, f: 7, kcal: 300 } },
          { name: 'Pileća prsa', baseAmount: 100, unit: 'g', macrosPer100: { p: 23, c: 0, f: 1.2, kcal: 110 } },
          { name: 'Svježi sir', baseAmount: 30, unit: 'g', macrosPer100: { p: 12, c: 3, f: 0.5, kcal: 70 } },
          { name: 'Zelena salata', baseAmount: 50, unit: 'g', macrosPer100: { p: 1, c: 3, f: 0, kcal: 15 } },
        ]
      }
    }
  },
  {
    day: 'Petak',
    meals: {
      dorucak: {
        name: 'Zobena kaša s proteinima',
        ingredients: [
          { name: 'Zobene pahuljice', baseAmount: 60, unit: 'g', macrosPer100: { p: 13, c: 68, f: 7, kcal: 389 } },
          { name: 'Mlijeko', baseAmount: 200, unit: 'ml', macrosPer100: { p: 3.3, c: 4.8, f: 1.5, kcal: 47 } },
          { name: 'Whey protein', baseAmount: 30, unit: 'g', macrosPer100: { p: 75, c: 5, f: 5, kcal: 380 } },
          { name: 'Šumsko voće', baseAmount: 50, unit: 'g', macrosPer100: { p: 1, c: 10, f: 0, kcal: 40 } },
          { name: 'Kikiriki maslac', baseAmount: 15, unit: 'g', macrosPer100: { p: 25, c: 20, f: 50, kcal: 588 } },
        ]
      },
      rucak: {
        name: 'Oslić s krumpirom',
        ingredients: [
          { name: 'Oslić', baseAmount: 200, unit: 'g', macrosPer100: { p: 17, c: 0, f: 0.5, kcal: 70 } },
          { name: 'Krumpir', baseAmount: 150, unit: 'g', macrosPer100: { p: 2, c: 17, f: 0.1, kcal: 77 } },
          { name: 'Blitva', baseAmount: 150, unit: 'g', macrosPer100: { p: 2, c: 4, f: 0.2, kcal: 19 } },
          { name: 'Maslinovo ulje', baseAmount: 10, unit: 'g', macrosPer100: { p: 0, c: 0, f: 100, kcal: 884 } },
        ]
      },
      uzina: {
        name: 'Skyr s bademima',
        ingredients: [
          { name: 'Skyr', baseAmount: 200, unit: 'g', macrosPer100: { p: 11, c: 4, f: 0.2, kcal: 60 } },
          { name: 'Bademi', baseAmount: 20, unit: 'g', macrosPer100: { p: 21, c: 22, f: 49, kcal: 579 } },
        ]
      },
      vecera: {
        name: 'Jaja i svježi sir',
        ingredients: [
          { name: 'Jaja', baseAmount: 2, unit: 'kom', macrosPer100: { p: 6, c: 0.6, f: 5, kcal: 72 } },
          { name: 'Posni sir', baseAmount: 150, unit: 'g', macrosPer100: { p: 12, c: 3, f: 0.5, kcal: 70 } },
          { name: 'Paprika', baseAmount: 100, unit: 'g', macrosPer100: { p: 1, c: 6, f: 0.3, kcal: 31 } },
          { name: 'Integralni kruh', baseAmount: 30, unit: 'g', macrosPer100: { p: 9, c: 43, f: 2, kcal: 240 } },
        ]
      }
    }
  },
  {
    day: 'Subota',
    meals: {
      dorucak: {
        name: 'Kajgana s povrćem',
        ingredients: [
          { name: 'Jaja', baseAmount: 3, unit: 'kom', macrosPer100: { p: 6, c: 0.6, f: 5, kcal: 72 } },
          { name: 'Šunka', baseAmount: 50, unit: 'g', macrosPer100: { p: 18, c: 2, f: 3, kcal: 110 } },
          { name: 'Integralni kruh', baseAmount: 60, unit: 'g', macrosPer100: { p: 9, c: 43, f: 2, kcal: 240 } },
          { name: 'Rajčica', baseAmount: 100, unit: 'g', macrosPer100: { p: 0.9, c: 3.9, f: 0.2, kcal: 18 } },
        ]
      },
      rucak: {
        name: 'Puretina s rižom',
        ingredients: [
          { name: 'Pureća prsa', baseAmount: 150, unit: 'g', macrosPer100: { p: 24, c: 0, f: 1.5, kcal: 114 } },
          { name: 'Riža', baseAmount: 80, unit: 'g', macrosPer100: { p: 7, c: 78, f: 1, kcal: 350 } },
          { name: 'Maslinovo ulje', baseAmount: 10, unit: 'g', macrosPer100: { p: 0, c: 0, f: 100, kcal: 884 } },
          { name: 'Salata', baseAmount: 100, unit: 'g', macrosPer100: { p: 1, c: 3, f: 0, kcal: 15 } },
        ]
      },
      uzina: {
        name: 'Smoothie sa šumskim voćem',
        ingredients: [
          { name: 'Šumsko voće', baseAmount: 100, unit: 'g', macrosPer100: { p: 1, c: 10, f: 0, kcal: 40 } },
          { name: 'Whey protein', baseAmount: 30, unit: 'g', macrosPer100: { p: 75, c: 5, f: 5, kcal: 380 } },
          { name: 'Mlijeko', baseAmount: 200, unit: 'ml', macrosPer100: { p: 3.3, c: 4.8, f: 1.5, kcal: 47 } },
        ]
      },
      vecera: {
        name: 'Tuna salata',
        ingredients: [
          { name: 'Tuna u komadićima', baseAmount: 120, unit: 'g', macrosPer100: { p: 25, c: 0, f: 1, kcal: 110 } },
          { name: 'Tjestenina', baseAmount: 50, unit: 'g', macrosPer100: { p: 13, c: 65, f: 2.5, kcal: 350 } },
          { name: 'Povrće', baseAmount: 150, unit: 'g', macrosPer100: { p: 1.5, c: 5, f: 0.2, kcal: 25 } },
          { name: 'Maslinovo ulje', baseAmount: 10, unit: 'g', macrosPer100: { p: 0, c: 0, f: 100, kcal: 884 } },
        ]
      }
    }
  },
  {
    day: 'Nedjelja',
    meals: {
      dorucak: {
        name: 'Palačinke od zobenih',
        ingredients: [
          { name: 'Zobene pahuljice', baseAmount: 60, unit: 'g', macrosPer100: { p: 13, c: 68, f: 7, kcal: 389 } },
          { name: 'Mlijeko', baseAmount: 100, unit: 'ml', macrosPer100: { p: 3.3, c: 4.8, f: 1.5, kcal: 47 } },
          { name: 'Jaje', baseAmount: 1, unit: 'kom', macrosPer100: { p: 6, c: 0.6, f: 5, kcal: 72 } },
          { name: 'Whey protein', baseAmount: 20, unit: 'g', macrosPer100: { p: 75, c: 5, f: 5, kcal: 380 } },
        ]
      },
      rucak: {
        name: 'Juneći gulaš s palentom',
        ingredients: [
          { name: 'Junetina', baseAmount: 150, unit: 'g', macrosPer100: { p: 26, c: 0, f: 10, kcal: 200 } },
          { name: 'Palenta', baseAmount: 80, unit: 'g', macrosPer100: { p: 8, c: 75, f: 1.5, kcal: 350 } },
          { name: 'Povrće (luk, mrkva)', baseAmount: 100, unit: 'g', macrosPer100: { p: 1, c: 10, f: 0.2, kcal: 41 } },
          { name: 'Maslinovo ulje', baseAmount: 10, unit: 'g', macrosPer100: { p: 0, c: 0, f: 100, kcal: 884 } },
        ]
      },
      uzina: {
        name: 'Grčki jogurt s voćem',
        ingredients: [
          { name: 'Grčki jogurt', baseAmount: 200, unit: 'g', macrosPer100: { p: 10, c: 4, f: 0, kcal: 59 } },
          { name: 'Šumsko voće', baseAmount: 100, unit: 'g', macrosPer100: { p: 1, c: 10, f: 0, kcal: 40 } },
        ]
      },
      vecera: {
        name: 'Posni sir s orasima',
        ingredients: [
          { name: 'Posni sir', baseAmount: 200, unit: 'g', macrosPer100: { p: 12, c: 3, f: 0.5, kcal: 70 } },
          { name: 'Orasi', baseAmount: 20, unit: 'g', macrosPer100: { p: 15, c: 14, f: 65, kcal: 654 } },
        ]
      }
    }
  }
];
