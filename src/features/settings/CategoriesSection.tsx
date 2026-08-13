import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, Tag, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  useCategories,
  useSubcategories,
  useCreateCategory,
  useDeleteCategory,
  useDeleteSubcategory,
} from '@/hooks/useCategories'
import { useToast } from '@/components/ui/Toast'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome.').max(60),
  type: z.enum(['receita', 'despesa', 'ambos']),
})
type CategoryFormValues = z.infer<typeof categoryFormSchema>

const subcategoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome.').max(60),
})
type SubcategoryFormValues = z.infer<typeof subcategoryFormSchema>

function SubcategoryRow({ categoryId }: { categoryId: string }) {
  const { user } = useAuth()
  const { data: subcategories } = useSubcategories(categoryId)
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const deleteSubcategory = useDeleteSubcategory()
  const [deletingSubcategory, setDeletingSubcategory] = useState<{ id: string; name: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubcategoryFormValues>({ resolver: zodResolver(subcategoryFormSchema) })

  const createSubcategory = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Usuário não autenticado.')
      const { error } = await supabase.from('subcategories').insert({ user_id: user.id, category_id: categoryId, name })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] })
      reset()
      showToast('success', 'Subcategoria criada.')
    },
    onError: () => showToast('error', 'Não foi possível criar a subcategoria.'),
  })

  return (
    <div className="ml-9 mb-3 flex flex-col gap-2">
      {(subcategories?.length ?? 0) > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {subcategories?.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-1 rounded-full bg-(--color-surface-alt) py-1 pl-2.5 pr-1.5 text-xs text-(--color-ink-600)"
            >
              {s.name}
              <button
                type="button"
                onClick={() => setDeletingSubcategory({ id: s.id, name: s.name })}
                aria-label={`Excluir ${s.name}`}
                className="rounded-full p-0.5 text-(--color-ink-400) hover:text-(--color-danger-600)"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="flex gap-2" onSubmit={handleSubmit((data) => createSubcategory.mutate(data.name))} noValidate>
        <input
          className="h-8 flex-1 rounded-lg border border-(--color-navy-100) px-2.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--color-navy-500)"
          placeholder="Nova subcategoria"
          aria-label="Nova subcategoria"
          {...register('name')}
        />
        <Button type="submit" size="sm" variant="secondary" isLoading={isSubmitting || createSubcategory.isPending}>
          Adicionar
        </Button>
      </form>
      {errors.name && <span className="text-xs text-(--color-danger-600)">{errors.name.message}</span>}

      <ConfirmDialog
        open={!!deletingSubcategory}
        title="Excluir subcategoria?"
        description={`"${deletingSubcategory?.name}" será removida. Movimentações que usam essa subcategoria ficarão sem subcategoria.`}
        confirmLabel="Excluir"
        isLoading={deleteSubcategory.isPending}
        onCancel={() => setDeletingSubcategory(null)}
        onConfirm={async () => {
          if (!deletingSubcategory) return
          try {
            await deleteSubcategory.mutateAsync(deletingSubcategory.id)
            showToast('success', 'Subcategoria excluída.')
          } catch {
            showToast('error', 'Não foi possível excluir a subcategoria.')
          } finally {
            setDeletingSubcategory(null)
          }
        }}
      />
    </div>
  )
}

export function CategoriesSection() {
  const { data: categories, isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({ resolver: zodResolver(categoryFormSchema), defaultValues: { type: 'despesa' } })

  async function onSubmit(data: CategoryFormValues) {
    try {
      await createCategory.mutateAsync({ name: data.name, type: data.type })
      showToast('success', 'Categoria criada.')
      reset({ name: '', type: data.type })
    } catch {
      showToast('error', 'Não foi possível criar a categoria. Verifique se o nome já existe.')
    }
  }

  return (
    <Card>
      <CardHeader title="Categorias e subcategorias" subtitle="Organize suas movimentações por categoria." />

      <form className="mb-5 flex flex-wrap items-end gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="min-w-[180px] flex-1">
          <Input label="Nova categoria" error={errors.name?.message} {...register('name')} />
        </div>
        <Select label="Tipo" className="w-40" {...register('type')}>
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
          <option value="ambos">Ambos</option>
        </Select>
        <Button type="submit" isLoading={isSubmitting || createCategory.isPending}>
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Adicionar
        </Button>
      </form>

      {isLoading ? null : (categories?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Tag}
          title="Nenhuma categoria cadastrada"
          description="Crie categorias para organizar receitas e despesas."
        />
      ) : (
        <ul className="divide-y divide-(--color-navy-100)">
          {categories?.map((c) => (
            <li key={c.id} className="py-2">
              <div className="flex w-full items-center gap-2 py-1 text-sm">
                <button
                  onClick={() => setExpanded((current) => (current === c.id ? null : c.id))}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  {expanded === c.id ? (
                    <ChevronDown className="h-4 w-4 text-(--color-ink-400)" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-(--color-ink-400)" aria-hidden="true" />
                  )}
                  <span className="text-(--color-ink-900)">{c.name}</span>
                </button>
                <span className="rounded-full bg-(--color-navy-100) px-2 py-0.5 text-[11px] text-(--color-navy-700)">
                  {c.type === 'ambos' ? 'Receita e despesa' : c.type === 'receita' ? 'Receita' : 'Despesa'}
                </span>
                <button
                  type="button"
                  onClick={() => setDeletingCategory({ id: c.id, name: c.name })}
                  aria-label={`Excluir ${c.name}`}
                  className="rounded p-1 text-(--color-ink-400) hover:bg-(--color-surface-alt) hover:text-(--color-danger-600)"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              {expanded === c.id && <SubcategoryRow categoryId={c.id} />}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deletingCategory}
        title="Excluir categoria?"
        description={`"${deletingCategory?.name}" e suas subcategorias serão removidas. Movimentações vinculadas ficarão sem categoria, e orçamentos dessa categoria serão excluídos.`}
        confirmLabel="Excluir"
        isLoading={deleteCategory.isPending}
        onCancel={() => setDeletingCategory(null)}
        onConfirm={async () => {
          if (!deletingCategory) return
          try {
            await deleteCategory.mutateAsync(deletingCategory.id)
            showToast('success', 'Categoria excluída.')
            setExpanded((current) => (current === deletingCategory.id ? null : current))
          } catch {
            showToast('error', 'Não foi possível excluir a categoria.')
          } finally {
            setDeletingCategory(null)
          }
        }}
      />
    </Card>
  )
}
