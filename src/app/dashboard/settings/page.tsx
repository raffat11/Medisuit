'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/auth-context';
import { useUserProfile } from '@/context/user-profile-context';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '@/lib/firebase';
import { Loader2, Save, KeyRound, Image as ImageIcon, Edit, Check, X, Combine } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useDialog } from '@/context/dialog-context';


const profileFormSchema = z.object({
  displayName: z.string().min(1, 'El nombre es requerido.'),
  email: z.string().email(),
});

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida.'),
    newPassword: z
      .string()
      .min(6, 'La nueva contraseña debe tener al menos 6 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export default function SettingsPage() {
  const { user } = useAuth();
  const { userProfile, loading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();
  const { openSupplierMergeDialog } = useDialog();

  const [isProfileSaving, setIsProfileSaving] = React.useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = React.useState(false);
  
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [photoURL, setPhotoURL] = React.useState<string | null>(userProfile?.photoURL || null);


  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    values: {
      displayName: userProfile?.displayName || user?.displayName || '',
      email: userProfile?.email || user?.email || '',
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    if (userProfile) {
        profileForm.reset({
            displayName: userProfile.displayName || user?.displayName || '',
            email: userProfile.email || user?.email || '',
        });
        setPhotoURL(userProfile.photoURL || null);
    }
  }, [userProfile, user, profileForm]);


  const onProfileSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    if (!user || !auth.currentUser) return;
    setIsProfileSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        displayName: data.displayName,
      }, { merge: true });

      toast({ title: 'Perfil Actualizado', description: 'Tu información ha sido guardada.' });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar tu perfil.',
        variant: 'destructive',
      });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const onPasswordSubmit = async (
    data: z.infer<typeof passwordFormSchema>
  ) => {
    if (!user || !user.email) return;
    setIsPasswordSaving(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        data.currentPassword
      );
      if (auth.currentUser) {
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, data.newPassword);
      }
      toast({
        title: 'Contraseña Actualizada',
        description: 'Tu contraseña ha sido cambiada exitosamente.',
      });
      passwordForm.reset();
    } catch (error: any) {
      console.error(error);
      let description = 'Ocurrió un error al cambiar la contraseña.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'La contraseña actual es incorrecta.';
      }
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsPasswordSaving(false);
    }
  };
  
  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setIsUploading(true);
    setUploadProgress(0);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(Math.round(progress));
      },
      (error) => {
        console.error("🔥 Error subiendo archivo:", error);
        toast({
          title: 'Error de Subida',
          description: `No se pudo subir la foto. Causa: ${error.message}`,
          variant: 'destructive',
        });
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setPhotoURL(downloadURL); 

          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: downloadURL });
          }

          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, { photoURL: downloadURL }, { merge: true });

          toast({
            title: 'Foto de Perfil Actualizada',
            description: 'Tu nueva foto de perfil ha sido guardada.',
          });
        } catch (updateError) {
          console.error("Error al actualizar perfil:", updateError);
          toast({
            title: 'Error de Actualización',
            description: 'La foto se subió pero no se pudo actualizar el perfil.',
            variant: 'destructive',
          });
        } finally {
          setIsUploading(false);
        }
      }
    );
  };

  const getInitials = (name?: string | null) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'DR';
  }

  if (isProfileLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-4">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Configuración
        </h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="grid auto-rows-max items-start gap-4 lg:col-span-2">
            <Card>
              <Form {...profileForm}>
                <form>
                  <CardHeader>
                    <CardTitle>Información de Perfil</CardTitle>
                    <CardDescription>
                      Edita tu nombre y email en el sistema.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre Completo</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isProfileSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <Button type="button" onClick={profileForm.handleSubmit(onProfileSubmit)} disabled={isProfileSaving || isPasswordSaving}>
                      {isProfileSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Guardar Nombre
                    </Button>
                  </CardContent>
                </form>
              </Form>
               <Form {...passwordForm}>
                 <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                  <CardHeader>
                    <CardTitle>Cambiar Contraseña</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña Actual</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              {...field}
                              disabled={isPasswordSaving}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nueva Contraseña</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              {...field}
                              disabled={isPasswordSaving}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              {...field}
                              disabled={isPasswordSaving}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <div className="flex items-center gap-2 p-6 pt-0">
                     <Button type="submit" variant="secondary" disabled={isProfileSaving || isPasswordSaving}>
                        {isPasswordSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <KeyRound className="mr-2 h-4 w-4" />
                        )}
                        Actualizar Contraseña
                    </Button>
                  </div>
                 </form>
               </Form>
            </Card>
          </div>
          <div className="grid auto-rows-max items-start gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Foto de Perfil</CardTitle>
                <CardDescription>
                  Sube una nueva foto de perfil.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={photoURL || undefined} alt="User avatar" />
                  <AvatarFallback className="text-3xl">
                    {getInitials(userProfile?.displayName || user?.displayName)}
                  </AvatarFallback>
                </Avatar>
                
                {isUploading && (
                  <div className="w-full space-y-1">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-xs text-muted-foreground text-center">
                      Subiendo... {uploadProgress}%
                    </p>
                  </div>
                )}

                <Button asChild variant="outline" className="w-full">
                  <label>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Cambiar Foto
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/gif"
                      className="sr-only"
                      onChange={handlePhotoUpload}
                      disabled={isUploading}
                    />
                  </label>
                </Button>
              </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Gestionar Proveedores</CardTitle>
                    <CardDescription>
                        Herramienta para corregir proveedores duplicados en el sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={openSupplierMergeDialog}>
                        <Combine className="mr-2 h-4 w-4" />
                        Fusionar Proveedores
                    </Button>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
