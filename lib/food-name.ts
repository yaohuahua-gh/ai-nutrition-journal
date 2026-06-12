const exactFoodMap: Record<string, string[]> = {
  鸡胸肉: ['chicken breast'],
  鸡肉: ['chicken'],
  牛肉: ['beef'],
  猪肉: ['pork'],
  羊肉: ['lamb'],
  三文鱼: ['salmon'],
  虾: ['shrimp'],
  鸡蛋: ['egg'],
  米饭: ['white rice', 'cooked rice'],
  糙米: ['brown rice'],
  燕麦: ['oatmeal', 'oats'],
  酸奶: ['greek yogurt', 'yogurt'],
  牛奶: ['milk'],
  豆浆: ['soy milk'],
  豆腐: ['tofu'],
  西兰花: ['broccoli'],
  生菜: ['lettuce'],
  菠菜: ['spinach'],
  番茄: ['tomato'],
  土豆: ['potato'],
  红薯: ['sweet potato'],
  玉米: ['corn'],
  牛油果: ['avocado'],
  香蕉: ['banana'],
  苹果: ['apple'],
  蓝莓: ['blueberries'],
  草莓: ['strawberries'],
  抹茶粉: ['matcha powder', 'green tea powder'],
  魔芋粉: ['konjac flour', 'konjac powder'],
  蛋白粉: ['protein powder'],
  全麦面包: ['whole wheat bread'],
  面包: ['bread'],
  面条: ['noodles'],
  意面: ['pasta'],
  饺子: ['dumpling'],
  包子: ['steamed bun'],
  花生: ['peanuts'],
  杏仁: ['almonds'],
  腰果: ['cashews'],
  橄榄油: ['olive oil']
}

const keywordFoodMap = Object.entries(exactFoodMap).sort((a, b) => b[0].length - a[0].length)

export function foodSearchCandidates(input: string) {
  const name = input.trim()
  if (!name) return []

  const candidates = new Set<string>()
  const exact = exactFoodMap[name]
  if (exact) exact.forEach((item) => candidates.add(item))

  keywordFoodMap.forEach(([keyword, values]) => {
    if (name.includes(keyword)) values.forEach((item) => candidates.add(item))
  })

  candidates.add(name)
  return Array.from(candidates)
}
