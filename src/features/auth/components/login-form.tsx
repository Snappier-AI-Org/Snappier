"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
    const router = useRouter();

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });
    const signInGithub = async () => {
    await authClient.signIn.social({
        provider: "github",
        }, {
        onSuccess: () => {
            router.push("/");
        },
        onError: () => {
            toast.error("Something went wrong");
        },
        });
    };
    const signInGoogle = async () => {
    await authClient.signIn.social({
        provider: "google",
        }, {
        onSuccess: () => {
            router.push("/");
        },
        onError: () => {
            toast.error("Something went wrong");
        }
    });
    };

    const onSubmit = async (values: LoginFormValues) => {
        await authClient.signIn.email({
            email: values.email,
            password: values.password,
            callbackURL: "/",
        }, {
            onSuccess: () => {
                router.push("/");
            },
            onError: (ctx) => {
                toast.error(ctx.error.message);
            },
        });
    };

    const isPending = form.formState.isSubmitting;

    return (
        <div className="w-full">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight">
                    Welcome back
                </h1>
                <p className="text-muted-foreground mt-2">
                    Sign in to your account to continue
                </p>
            </div>

            {/* OAuth Buttons */}
            <div className="grid gap-3 mb-6">
                <Button
                    onClick={signInGithub}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-medium hover:bg-accent/80 transition-all duration-200"
                    type="button"
                    disabled={isPending}
                >
                    <Image alt="Github" src="/logos/github.svg" width={20} height={20} className="dark:invert" />
                    Continue with GitHub
                </Button>
                <Button
                    onClick={signInGoogle}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-medium hover:bg-accent/80 transition-all duration-200"
                    type="button"
                    disabled={isPending}
                >
                    <Image alt="Google" src="/logos/google.svg" width={20} height={20} />
                    Continue with Google
                </Button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-4 text-muted-foreground">
                        Or continue with email
                    </span>
                </div>
            </div>

            {/* Email/Password Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => {
                            const id = "login-email";
                            return (
                                <FormItem>
                                    <FormLabel htmlFor={id}>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            id={id}
                                            aria-describedby={id + "-description"}
                                            type="email"
                                            placeholder="you@example.com"
                                            className="h-11"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage id={id + "-description"} />
                                </FormItem>
                            );
                        }}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => {
                            const id = "login-password";
                            return (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel htmlFor={id}>Password</FormLabel>
                                        <Link 
                                            href="/forgot-password" 
                                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <FormControl>
                                        <Input
                                            id={id}
                                            aria-describedby={id + "-description"}
                                            type="password"
                                            placeholder="Enter your password"
                                            className="h-11"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage id={id + "-description"} />
                                </FormItem>
                            );
                        }}
                    />
                    <Button 
                        type="submit" 
                        size="lg"
                        className="w-full h-12 font-medium mt-2" 
                        disabled={isPending}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            "Sign in"
                        )}
                    </Button>
                </form>
            </Form>

            {/* Sign up link */}
            <p className="text-center text-sm text-muted-foreground mt-6">
                Don't have an account?{" "}
                <Link 
                    href="/signup" 
                    className="font-medium text-primary hover:underline underline-offset-4 transition-colors"
                >
                    Create one
                </Link>
            </p>
        </div>
    );
}