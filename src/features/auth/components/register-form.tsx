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
import { Loader2, CheckCircle2 } from "lucide-react";
import { useReferralTracking, getReferralCode, clearReferralCode } from "@/features/referrals/hooks/use-referral-tracking";

const registerSchema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
})
.refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
    const router = useRouter();
    
    // Track referral code from URL
    useReferralTracking();

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    // Helper function to attribute referral after successful signup
    const attributeReferral = async () => {
        const referralCode = getReferralCode();
        if (referralCode) {
            try {
                await fetch("/api/referral/attribute", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ referralCode }),
                });
                clearReferralCode();
            } catch (err) {
                console.error("Failed to attribute referral:", err);
            }
        }
    };

    const signInGithub = async () => {
        await authClient.signIn.social({
            provider: "github",
        }, {
            onSuccess: async () => {
                await attributeReferral();
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
            onSuccess: async () => {
                await attributeReferral();
                router.push("/");
            },
            onError: () => {
                toast.error("Something went wrong");
            }
        });
    };

    const onSubmit = async (values: RegisterFormValues) => {
        await authClient.signUp.email(
            {
                name: values.email,
                email: values.email,
                password: values.password,
                callbackURL: "/",
            },
            {
                onSuccess: async () => {
                    await attributeReferral();
                    router.push("/");
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message);
                }
            }
        )
    }

    const isPending = form.formState.isSubmitting;

    return (
        <div className="w-full">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight">
                    Create your account
                </h1>
                <p className="text-muted-foreground mt-2">
                    Start building powerful automations today
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
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        className="h-11"
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
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="Create a strong password"
                                        className="h-11"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="Confirm your password"
                                        className="h-11"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    {/* Benefits reminder */}
                    <div className="py-3 space-y-2">
                        {[
                            "Unlimited workflow executions",
                            "50+ integrations included",
                            "AI-powered automation"
                        ].map((benefit, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <span>{benefit}</span>
                            </div>
                        ))}
                    </div>

                    <Button 
                        type="submit" 
                        size="lg"
                        className="w-full h-12 font-medium" 
                        disabled={isPending}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            "Create account"
                        )}
                    </Button>
                </form>
            </Form>

            {/* Sign in link */}
            <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link 
                    href="/login" 
                    className="font-medium text-primary hover:underline underline-offset-4 transition-colors"
                >
                    Sign in
                </Link>
            </p>
        </div>
    );
}