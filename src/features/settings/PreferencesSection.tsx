import { useUserSettings, useUpdateUserSettings } from '@/hooks/useProfile'
import { useToast } from '@/components/ui/Toast'
import { Card, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'

export function PreferencesSection() {
  const { data: settings, isLoading } = useUserSettings()
  const updateSettings = useUpdateUserSettings()
  const { showToast } = useToast()

  async function handleChange(field: string, value: string) {
    try {
      await updateSettings.mutateAsync({ [field]: value })
      showToast('success', 'Preferência atualizada.')
    } catch {
      showToast('error', 'Não foi possível salvar a preferência.')
    }
  }

  if (isLoading || !settings) {
    return (
      <Card>
        <Skeleton className="h-32 w-full" />
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader title="Preferências" subtitle="Regras aplicadas em todo o sistema." />
      <div className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Tema" value={settings.theme} onChange={(e) => handleChange('theme', e.target.value)}>
          <option value="automatico">Automático</option>
          <option value="claro">Claro</option>
          <option value="escuro">Escuro</option>
        </Select>

        <Select
          label="Reconhecimento de compras no cartão"
          value={settings.card_recognition_mode}
          onChange={(e) => handleChange('card_recognition_mode', e.target.value)}
        >
          <option value="data_compra">Na data da compra</option>
          <option value="mes_fatura">No mês da fatura</option>
        </Select>

        <Select
          label="Separador decimal de entrada"
          value={settings.decimal_separator}
          onChange={(e) => handleChange('decimal_separator', e.target.value)}
        >
          <option value="virgula">Vírgula (1.234,56)</option>
          <option value="ponto">Ponto (1234.56)</option>
        </Select>
      </div>
      <p className="mt-3 text-xs text-(--color-ink-400)">
        O reconhecimento de compras no cartão será aplicado assim que a aba Cartões (Fase 2) estiver disponível.
      </p>
    </Card>
  )
}
