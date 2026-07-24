// Purpose: Category navigation — groups CJ categories into German mega-menu
// Docs: AGENTS.md

import { getCategories } from '@/lib/supabase/queries'
import { groupCategories } from '@/lib/category-groups'
import { MegaMenu } from './mega-menu'

export async function CategoryNav() {
  const categories = await getCategories()
  if (categories.length === 0) return null

  const { groups, ungrouped } = groupCategories(categories)
  const allGroups =
    ungrouped.length > 0 ? [...groups, { label: 'Weitere', categories: ungrouped }] : groups

  return <MegaMenu groups={allGroups} />
}
