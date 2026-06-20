import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RegisterInputRole } from "@workspace/api-client-react";

const registerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  role: z.nativeEnum(RegisterInputRole),
  matriculation_number: z.string().optional(),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      role: RegisterInputRole.student,
      matriculation_number: "",
    },
  });

  const selectedRole = form.watch("role");

  function onSubmit(values: z.infer<typeof registerSchema>) {
    // Clean up optional fields
    const data = { ...values };
    if (data.role !== RegisterInputRole.student || !data.matriculation_number) {
      delete data.matriculation_number;
    }

    registerMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          localStorage.setItem("naub_token", res.token);
          localStorage.setItem("naub_user", JSON.stringify(res.user));
          toast({
            title: "Account created!",
            description: "Welcome to NAUB Home Finder.",
          });
          const role = res.user?.role;
          if (role === "landlord" || role === "agent") {
            setLocation("/kyc");
          } else {
            setLocation("/dashboard");
          }
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: (err as any).error || err.message || "An error occurred during registration.",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-2 text-center pb-6">
          <Link href="/" className="inline-flex justify-center mb-2 cursor-pointer">
            <div className="h-10 w-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-xl">
              N
            </div>
          </Link>
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Join NAUB Home Finder for safe housing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} data-testid="input-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} data-testid="input-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} data-testid="input-email" />
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
                      <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>I am a...</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={RegisterInputRole.student}>Student looking for housing</SelectItem>
                        <SelectItem value={RegisterInputRole.landlord}>Landlord listing properties</SelectItem>
                        <SelectItem value={RegisterInputRole.agent}>Agent assisting students</SelectItem>
                        <SelectItem value={RegisterInputRole.escrow_officer}>Escrow Officer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedRole === RegisterInputRole.student && (
                <FormField
                  control={form.control}
                  name="matriculation_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matriculation Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="NAUB/1234/..." {...field} data-testid="input-matric" />
                      </FormControl>
                      <FormDescription>Helps verify your student status faster.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={registerMutation.isPending}
                data-testid="button-submit"
              >
                {registerMutation.isPending ? "Creating account..." : "Register"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="font-medium text-primary hover:underline" data-testid="link-to-login">
              Log in instead
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
