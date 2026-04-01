'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
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
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({ message: 'Email inválido.' }),
  password: z
    .string()
    .min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
});

type UserFormValue = z.infer<typeof formSchema>;

// Memoized form component to prevent unnecessary re-renders causing issues on autofill in iOS/iPadOS
const LoginForm = React.memo(({
  onSubmit,
  isLoading,
  isSignUp = false
}: {
  onSubmit: (data: UserFormValue) => void,
  isLoading: boolean,
  isSignUp?: boolean
}) => {
  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isSignUp && (
           <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
              <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                  <Input
                      placeholder="Dr. John Doe"
                      disabled={isLoading}
                      {...field}
                  />
                  </FormControl>
                  <FormMessage />
              </FormItem>
              )}
          />
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="m@example.com"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="******"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </Button>
      </form>
    </Form>
  );
});

LoginForm.displayName = 'LoginForm';


export default function LoginPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const onSubmit = async (data: UserFormValue) => {
    setIsLoading(true);
    try {
      if (activeTab === 'login') {
        await signInWithEmailAndPassword(auth, data.email, data.password);
        toast({ title: 'Inicio de Sesión Exitoso' });
      } else {
        // Check if user is authorized
        const authorizedUsersRef = collection(db, 'authorizedUsers');
        const q = query(authorizedUsersRef, where('email', '==', data.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          toast({
            title: 'Registro no autorizado',
            description: 'Este correo electrónico no tiene permiso para registrarse. Por favor, contacta al administrador.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: data.name });
        
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: data.name,
            email: user.email,
            photoURL: null,
        });

        toast({ title: 'Registro Exitoso', description: 'Tu cuenta ha sido creada.' });
      }
    } catch (error: any) {
      const errorCode = error.code;
      let errorMessage = 'Ocurrió un error. Por favor, inténtalo de nuevo.';
      if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        errorMessage = 'La contraseña o el email son incorrectos.';
      } else if (errorCode === 'auth/user-not-found') {
        errorMessage = 'No se encontró un usuario con ese email.';
      } else if (errorCode === 'auth/email-already-in-use') {
        errorMessage = 'Este email ya está en uso. Intenta iniciar sesión.';
      } else if (errorCode === 'auth/invalid-email') {
        errorMessage = 'El formato del email no es válido.';
      } else if (errorCode === 'auth/weak-password') {
        errorMessage = 'La contraseña es demasiado débil.';
      }
      toast({
        title: 'Error de Autenticación',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <Logo />
      </div>
       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-sm mt-48 sm:mt-0">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
          <TabsTrigger value="signup">Registrarse</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
              <CardDescription>
                Introduce tu email y contraseña para acceder al panel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm onSubmit={onSubmit} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Crear una cuenta</CardTitle>
              <CardDescription>
                Introduce tus datos para crear una nueva cuenta. Solo se permiten correos autorizados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm onSubmit={onSubmit} isLoading={isLoading} isSignUp={true} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
