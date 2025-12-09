"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog"
import { SidebarMenuButton } from "@repo/ui/components/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs"
import AccountSettingsForm from "./account-settings-form-edit"
import { Settings } from "lucide-react"
import PasswordFormEdit from "./password-form-edit"
import { useTranslations } from "next-intl"

export default function EditSettingsFormModal() {
  const t = useTranslations('Settings');
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton className="gap-2">
          <Settings className="h-4 w-4" />
          {t('title')}
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('accountSettings')}</DialogTitle>
          <DialogDescription>
            {t('accountSettingsDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center w-full">
          <Tabs defaultValue="account" className="w-full max-w-[400px]">
            <TabsList className="w-full">
              <TabsTrigger value="account" className="flex-1">
                {t('accountDetails')}
              </TabsTrigger>
              <TabsTrigger value="password" className="flex-1">
                {t('password')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              <AccountSettingsForm />
            </TabsContent>
            <TabsContent value="password">
              <PasswordFormEdit />
            </TabsContent>
            <TabsContent value="notifications">Change your notifications here.</TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
