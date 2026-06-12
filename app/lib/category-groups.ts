// Purpose: Group raw CJ categories into German mega-menu groups
// Docs: AGENTS.md

export type CategoryGroup = {
  label: string
  slugMatchers: RegExp[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { label: 'Damenmode', slugMatchers: [/lady|dress|blazer|women|suits|skirt|blouse/i] },
  { label: 'Herrenmode', slugMatchers: [/men's|men |shirt|sweater|hoodie|jacket/i] },
  { label: 'Schmuck & Accessoires', slugMatchers: [/necklace|pendant|earring|bracelet|bangle|jewel|titanium|ring|watch/i] },
  { label: 'Schuhe & Taschen', slugMatchers: [/pump|shoe|vulcanize|backpack|bag|boot|sandal/i] },
  { label: 'Haustierbedarf', slugMatchers: [/pet|dog|cat|leash|collar|harness|nest/i] },
  { label: 'Haus & Wohnen', slugMatchers: [/bedding|home|office|storage|pillow|sofa|mill|kitchen|carpet|curtain/i] },
  { label: 'Beauty & Pflege', slugMatchers: [/facial|beauty|care|massager|skincare|cosmetic/i] },
  { label: 'Elektronik', slugMatchers: [/speaker|charger|thermometer|tech|light|camera|smart/i] },
  { label: 'Sport & Outdoor', slugMatchers: [/sport|fitness|yoga|camping|cycle|swim/i] },
  { label: 'Spielzeug & Kinder', slugMatchers: [/toy|kid|child|baby|puzzle/i] },
]

export type GroupedCategory = {
  label: string
  categories: { id: string; name: string }[]
}

export function groupCategories(
  categories: { id: string; name: string }[],
): { groups: GroupedCategory[]; ungrouped: { id: string; name: string }[] } {
  const groups: GroupedCategory[] = CATEGORY_GROUPS.map((g) => ({
    label: g.label,
    categories: [],
  }))
  const ungrouped: { id: string; name: string }[] = []

  for (const cat of categories) {
    const idx = CATEGORY_GROUPS.findIndex((g) =>
      g.slugMatchers.some((rx) => rx.test(cat.name)),
    )
    if (idx >= 0) {
      groups[idx].categories.push(cat)
    } else {
      ungrouped.push(cat)
    }
  }

  return { groups: groups.filter((g) => g.categories.length > 0), ungrouped }
}
