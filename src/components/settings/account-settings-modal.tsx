"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AccountSettingsForm from "./account-settings-form-edit"
import { Settings } from "lucide-react"

export default function EditSettingsFormModal() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>
            Edit your account settings here.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center w-full">
          <Tabs defaultValue="account" className="w-full max-w-[400px]">
            <TabsList className="w-full">
              <TabsTrigger value="account" className="flex-1">
                Account Details
              </TabsTrigger>
              <TabsTrigger value="password" className="flex-1">
                Password
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex-1">
                Notifications
              </TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              <AccountSettingsForm />
            </TabsContent>
            <TabsContent value="password">Change your password here.</TabsContent>
            <TabsContent value="notifications">Change your notifications here.</TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
