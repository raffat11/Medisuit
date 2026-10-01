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
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '@/lib/firebase';
import { Loader2, Save, KeyRound, Image as ImageIcon, Combine, Building2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useDialog } from '@/context/dialog-context';

// --- Esquemas de validación ---
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

const clinicFormSchema = z.object({
  entityName: z.string().min(1, 'El nombre de la entidad es requerido.'),
  phone: z.string().optional(),
  address: z.string().optional(),
});
// ------------------------------

export default function SettingsPage() {
  const { user } = useAuth();
  const { userProfile, loading: isProfileLoading } = useUserProfile();
  const { toast } = useToast();
  const { openSupplierMergeDialog } = useDialog();

  // Estados de carga
  const [isProfileSaving, setIsProfileSaving] = React.useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = React.useState(false);
  const [isClinicSaving, setIsClinicSaving] = React.useState(false);
  
  // Estados de subida de archivos (Doctor)
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [photoURL, setPhotoURL] = React.useState<string | null>(userProfile?.photoURL || null);

  // Estados de subida de archivos (Logo Clínica)
  const [isClinicLogoUploading, setIsClinicLogoUploading] = React.useState(false);
  const [clinicLogoProgress, setClinicLogoProgress] = React.useState(0);
  const [clinicLogoURL, setClinicLogoURL] = React.useState<string | null>(null);

  // Formularios
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

  const clinicForm = useForm<z.infer<typeof clinicFormSchema>>({
    resolver: zodResolver(clinicFormSchema),
    defaultValues: {
      entityName: '',
      phone: '',
      address: '',
    },
  });

  // Cargar datos iniciales
  React.useEffect(() => {
    if (userProfile) {
        profileForm.reset({
            displayName: userProfile.displayName || user?.displayName || '',
            email: userProfile.email || user?.email || '',
        });
        setPhotoURL(userProfile.photoURL || null);
    }
  }, [userProfile, user, profileForm]);

  // Cargar datos de la clínica desde Firestore
  React.useEffect(() => {
    const fetchClinicSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'clinic_profile'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          clinicForm.reset({
            entityName: data.entityName || '',
            phone: data.phone || '',
            address: data.address || '',
          });
          setClinicLogoURL(data.logoURL || null);
        }
      } catch (error) {
        console.error("Error fetching clinic settings", error);
      }
    };
    fetchClinicSettings();
  }, [clinicForm]);


  // --- Controladores de Submit ---
  const onClinicSubmit = async (data: z.infer<typeof clinicFormSchema>) => {
    setIsClinicSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'clinic_profile'), data, { merge: true });
      toast({ title: 'Perfil de la Clínica Actualizado', description: 'Los datos comerciales han sido guardados.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo guardar la configuración de la clínica.', variant: 'destructive' });
    } finally {
      setIsClinicSaving(false);
    }
  };

  const onProfileSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    if (!user || !auth.currentUser) return;
    setIsProfileSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { displayName: data.displayName }, { merge: true });

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

  const onPasswordSubmit = async (data: z.infer<typeof passwordFormSchema>) => {
    if (!user || !user.email) return;
    setIsPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      if (auth.currentUser) {
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, data.newPassword);
      }
      toast({ title: 'Contraseña Actualizada', description: 'Tu contraseña ha sido cambiada exitosamente.' });
      passwordForm.reset();
    } catch (error: any) {
      console.error(error);
      let description = 'Ocurrió un error al cambiar la contraseña.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'La contraseña actual es incorrecta.';
      }
      toast({ title: 'Error', description, variant: 'destructive' });
    } finally {
      setIsPasswordSaving(false);
    }
  };
  
  // --- Controladores de Subida de Archivos ---
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast({ title: 'Imagen muy pesada', description: 'Por favor usa una foto de menos de 1MB.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(50);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setPhotoURL(base64String);

        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, { photoURL: base64String }, { merge: true });
        }

        setUploadProgress(100);
        setIsUploading(false);
        toast({ title: 'Foto de Perfil Actualizada', description: 'Tu nueva foto ha sido guardada exitosamente.' });
      };

      reader.onerror = () => {
        throw new Error("No se pudo leer el archivo de imagen.");
      };

      reader.readAsDataURL(file);

    } catch (error: any) {
      console.error("🔥 Error actualizando foto:", error);
      toast({ 
        title: 'Error de Actualización', 
        description: error.message || 'No se pudo guardar la foto.', 
        variant: 'destructive' 
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClinicLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast({ title: 'Imagen muy pesada', description: 'Por favor usa un logo de menos de 1MB.', variant: 'destructive' });
      return;
    }

    setIsClinicLogoUploading(true);
    setClinicLogoProgress(50);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        await setDoc(doc(db, 'settings', 'clinic_profile'), { logoURL: base64String }, { merge: true });
        
        setClinicLogoURL(base64String);
        setClinicLogoProgress(100);
        setIsClinicLogoUploading(false);

        toast({ title: 'Logo Actualizado', description: 'El logo se ha guardado correctamente.' });
      };

      reader.onerror = () => {
        throw new Error("No se pudo leer el archivo de imagen.");
      };

      reader.readAsDataURL(file);

    } catch (error: any) {
      console.error("🔥 Error convirtiendo logo:", error);
      toast({ 
        title: 'Error de Subida', 
        description: error.message || 'No se pudo procesar la imagen.', 
        variant: 'destructive' 
      });
      setIsClinicLogoUploading(false);
      setClinicLogoProgress(0);
    }
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
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 mb-10">
      <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-4">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Configuración General
        </h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          
          {/* COLUMNA IZQUIERDA: Formularios de Texto */}
          <div className="grid auto-rows-max items-start gap-4 lg:col-span-2">
            
            {/* 1. PERFIL DE LA CLÍNICA */}
            <Card>
              <Form {...clinicForm}>
                <form onSubmit={clinicForm.handleSubmit(onClinicSubmit)}>
                  <CardHeader>
                    <CardTitle>Perfil de la Clínica</CardTitle>
                    <CardDescription>
                      Configura los datos de la entidad. Esta información aparecerá en las facturas y recibos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={clinicForm.control}
                      name="entityName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Entidad</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. Centro Médico MediSuite" {...field} disabled={isClinicSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={clinicForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej. +57 300 123 4567" {...field} disabled={isClinicSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clinicForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej. Calle 123 #45-67" {...field} disabled={isClinicSaving} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                  <div className="flex items-center gap-2 p-6 pt-0">
                    <Button type="submit" disabled={isClinicSaving}>
                      {isClinicSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Building2 className="mr-2 h-4 w-4" />
                      )}
                      Guardar Datos de Clínica
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>

            {/* 2. PERFIL DEL USUARIO / DOCTOR */}
            <Card>
              <Form {...profileForm}>
                <form>
                  <CardHeader>
                    <CardTitle>Perfil del Doctor</CardTitle>
                    <CardDescription>
                      Edita tu nombre personal y correo en el sistema.
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
            </Card>

            {/* 3. CAMBIAR CONTRASEÑA */}
            <Card>
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
                            <Input type="password" {...field} disabled={isPasswordSaving} />
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
                            <Input type="password" {...field} disabled={isPasswordSaving} />
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
                            <Input type="password" {...field} disabled={isPasswordSaving} />
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

          {/* COLUMNA DERECHA: Fotos y Acciones Extra */}
          <div className="grid auto-rows-max items-start gap-4">
            
            {/* LOGO DE LA CLÍNICA */}
            <Card>
              <CardHeader>
                <CardTitle>Logo de la Entidad</CardTitle>
                <CardDescription>
                  Sube el logotipo que aparecerá en los recibos.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 rounded-md">
                  <AvatarImage src={clinicLogoURL || undefined} alt="Clinic Logo" className="object-contain" />
                  <AvatarFallback className="text-3xl rounded-md bg-muted">
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                
                {isClinicLogoUploading && (
                  <div className="w-full space-y-1">
                    <Progress value={clinicLogoProgress} className="w-full" />
                    <p className="text-xs text-muted-foreground text-center">
                      Subiendo... {clinicLogoProgress}%
                    </p>
                  </div>
                )}

                <div className="flex flex-col w-full gap-2">
                  <Button asChild variant="outline" className="w-full">
                    <label className="cursor-pointer">
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Cambiar Logo
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml"
                        className="sr-only"
                        onChange={handleClinicLogoUpload}
                        disabled={isClinicLogoUploading}
                      />
                    </label>
                  </Button>

                  {clinicLogoURL && (
                    <Button 
                      variant="ghost" 
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        setClinicLogoURL(null);
                        await setDoc(doc(db, 'settings', 'clinic_profile'), { logoURL: null }, { merge: true });
                        toast({ title: 'Logo Removido', description: 'Se ha quitado el logotipo de la entidad.' });
                      }}
                    >
                      Quitar Logo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* FOTO DEL DOCTOR */}
            <Card>
              <CardHeader>
                <CardTitle>Foto del Doctor</CardTitle>
                <CardDescription>
                  Sube tu foto personal de perfil.
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

                <div className="flex flex-col w-full gap-2">
                  <Button asChild variant="outline" className="w-full">
                    <label className="cursor-pointer">
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

                  {photoURL && (
                    <Button 
                      variant="ghost" 
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        setPhotoURL(null);
                        if (user) {
                          const userDocRef = doc(db, 'users', user.uid);
                          await setDoc(userDocRef, { photoURL: null }, { merge: true });
                        }
                        toast({ title: 'Foto Removida', description: 'Se ha restaurado el avatar por defecto.' });
                      }}
                    >
                      Quitar Foto
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* PROVEEDORES */}
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