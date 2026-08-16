import { useState } from 'react'
import { User, Tag, CreditCard, SlidersHorizontal, ShieldCheck } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { ProfileSection } from '@/features/settings/ProfileSection'
import { CategoriesSection } from '@/features/settings/CategoriesSection'
import { PaymentMethodsSection } from '@/features/settings/PaymentMethodsSection'
import { PreferencesSection } from '@/features/settings/PreferencesSection'
import { AccessControlSection } from '@/features/settings/AccessControlSection'

const BASE_TABS = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'categorias', label: 'Categorias', icon: Tag },
  { id: 'pagamento', label: 'Formas de pagamento', icon: CreditCard },
  { id: 'preferencias', label: 'Preferências', icon: SlidersHorizontal },
] as const

const ACCESS_TAB = { id: 'acesso', label: 'Acesso', icon: ShieldCheck } as const

type TabId = (typeof BASE_TABS)[number]['id'] | typeof ACCESS_TAB.id

export function SettingsPage() {
  const { data: profile } = useProfile()
  const [activeTab, setActiveTab] = useState<TabId>('perfil')
  const tabs = profile?.is_admin ? [...BASE_TABS, ACCESS_TAB] : BASE_TABS

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-(--color-ink-900)">Configurações</h1>
        <p className="text-sm text-(--color-ink-400)">Perfil, categorias, formas de pagamento e preferências.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-(--color-navy-100)">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-none items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-(--color-navy-900) text-(--color-navy-900)'
                : 'border-transparent text-(--color-ink-400) hover:text-(--color-ink-900)'
            }`}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' && <ProfileSection />}
      {activeTab === 'categorias' && <CategoriesSection />}
      {activeTab === 'pagamento' && <PaymentMethodsSection />}
      {activeTab === 'preferencias' && <PreferencesSection />}
      {activeTab === 'acesso' && profile?.is_admin && <AccessControlSection />}
    </div>
  )
}
