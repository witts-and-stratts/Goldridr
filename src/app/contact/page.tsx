"use client";

import { useState } from "react";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { Button } from "@/components/ui/button";
import { SuperField } from "@/components/ui/super-field";
import {
  MapPin,
  Mail,
  Phone
} from "lucide-react";
import QRCode from "react-qr-code";

const VCARD_DATA = `BEGIN:VCARD
VERSION:3.0
FN:Goldridr Concierge
ORG:Goldridr
TEL;TYPE=WORK,VOICE:+1 555 123 4567
EMAIL:concierge@goldridr.com
ADR;TYPE=WORK:;;Houston, TX;United States
END:VCARD`;

import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { z } from "zod";

const contactSchema = z.object( {
  firstName: z.string().min( 1, "First name is required" ),
  lastName: z.string().min( 1, "Last name is required" ),
  email: z.email( "Invalid email address" ),
  phone: z.string().min( 10, "Phone number must be at least 10 characters" ),
  message: z.string().min( 10, "Message must be at least 10 characters" ),
} );

export default function ContactPage() {
  const form = useForm( {
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      message: "",
    },
    validators: {
      onChange: contactSchema,
    },
    onSubmit: async ( { value } ) => {
      // Handle submission
      console.log( value );
      await new Promise( ( resolve ) => setTimeout( resolve, 1000 ) );
      alert( "Message sent!" );
    },
  } );

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <div className="flex-1 w-full max-w-7xl mx-auto px-8 py-12 md:py-24">
        <div className="grid md:grid-cols-2 gap-16 lg:gap-24">

          {/* Contact Information */ }
          <div className="space-y-12">
            <div>
              <h1 className="font-serif text-3xl md:text-5xl text-white mb-6">
                GET IN TOUCH
              </h1>
              <p className="text-gray-400 font-light text-lg leading-relaxed max-w-md">
                We are here to help with any questions or specific needs you may have.
                Reach out to us and experience the Goldridr difference.
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="text-gold">
                  <Phone className="size-6" strokeWidth={ 1 } />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Phone</h3>
                  <p className="text-gray-400 font-light">+1 (555) 123-4567</p>
                  <p className="text-gray-500 text-sm mt-1">Mon-Fri from 8am to 5pm.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="text-gold">
                  <Mail className="size-6" strokeWidth={ 1 } />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Email</h3>
                  <p className="text-gray-400 font-light">concierge@goldridr.com</p>
                  <p className="text-gray-500 text-sm mt-1 text-balance">Depending on the volume, we will do our best to answer your email within 24 hours.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="text-gold">
                  <MapPin className="size-6" strokeWidth={ 1 } />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Office</h3>
                  <p className="text-gray-400 font-light">
                    Houston, TX, United States
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10">
              <div className="bg-white p-4 rounded-xl w-fit">
                <QRCode
                  value={ VCARD_DATA }
                  size={ 128 }
                  style={ { height: "auto", maxWidth: "100%", width: "100%" } }
                  viewBox={ `0 0 128 128` }
                />
              </div>
              <p className="text-gray-500 text-sm mt-3">Scan to add to contacts</p>
            </div>
          </div>

          {/* Contact Form */ }
          <div className="md:bg-white/5 md:border md:border-white/10 md:p-10 rounded-2xl">
            <h2 className="text-2xl font-wide text-white mb-6 uppercase tracking-widest">Send us a Message</h2>
            <form
              onSubmit={ ( e ) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              } }
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <form.Field
                  name="firstName"
                  children={ ( field ) => (
                    <SuperField
                      id="first-name"
                      type="text"
                      label="First name"
                      placeholder="First name"
                      labelClassName="text-gray-400"
                      fieldClassName="bg-black/50 border-white/20 text-white placeholder:text-gray-600 focus:border-gold focus:ring-gold"
                      value={ field.state.value }
                      onChange={ ( e ) => field.handleChange( e.target.value ) }
                      onBlur={ field.handleBlur }
                      error={ field.state.meta.errors ? field.state.meta.errors.join( ", " ) : undefined }
                    />
                  ) }
                />

                <form.Field
                  name="lastName"
                  children={ ( field ) => (
                    <SuperField
                      id="last-name"
                      type="text"
                      label="Last name"
                      placeholder="Last name"
                      labelClassName="text-gray-400"
                      fieldClassName="bg-black/50 border-white/20 text-white placeholder:text-gray-600 focus:border-gold focus:ring-gold"
                      value={ field.state.value }
                      onChange={ ( e ) => field.handleChange( e.target.value ) }
                      onBlur={ field.handleBlur }
                      error={ field.state.meta.errors ? field.state.meta.errors.join( ", " ) : undefined }
                    />
                  ) }
                />
              </div>

              <form.Field
                name="email"
                children={ ( field ) => (
                  <SuperField
                    id="email"
                    type="email"
                    label="Email"
                    placeholder="you@company.com"
                    labelClassName="text-gray-400"
                    fieldClassName="bg-black/50 border-white/20 text-white placeholder:text-gray-600 focus:border-gold focus:ring-gold"
                    value={ field.state.value }
                    onChange={ ( e ) => field.handleChange( e.target.value ) }
                    onBlur={ field.handleBlur }
                    error={ field.state.meta.errors ? field.state.meta.errors.join( ", " ) : undefined }
                  />
                ) }
              />

              <form.Field
                name="phone"
                children={ ( field ) => (
                  <SuperField
                    id="phone"
                    type="tel"
                    label="Phone number"
                    placeholder="+1 (555) 000-0000"
                    labelClassName="text-gray-400"
                    fieldClassName="bg-black/50 border-white/20 text-white placeholder:text-gray-600 focus:border-gold focus:ring-gold"
                    value={ field.state.value }
                    onChange={ ( e ) => field.handleChange( e.target.value ) }
                    onBlur={ field.handleBlur }
                    error={ field.state.meta.errors ? field.state.meta.errors.join( ", " ) : undefined }
                  />
                ) }
              />

              <form.Field
                name="message"
                children={ ( field ) => (
                  <SuperField
                    id="message"
                    type="textarea"
                    label="Message"
                    placeholder="Tell us how we can help..."
                    labelClassName="text-gray-400"
                    rows={ 5 }
                    fieldClassName="min-h-[150px] bg-black/50 border-white/20 text-white placeholder:text-gray-600 focus:border-gold focus:ring-gold"
                    value={ field.state.value }
                    onChange={ ( e ) => field.handleChange( e.target.value ) }
                    onBlur={ field.handleBlur }
                    error={ field.state.meta.errors ? field.state.meta.errors.join( ", " ) : undefined }
                  />
                ) }
              />

              <form.Subscribe
                selector={ ( state ) => [ state.canSubmit, state.isSubmitting ] }
                children={ ( [ canSubmit, isSubmitting ] ) => (
                  <Button type="submit" size={ 'lg' } variant={ 'outline' } className="w-full" disabled={ !canSubmit }>
                    { isSubmitting ? 'SENDING...' : 'SEND MESSAGE' }
                  </Button>
                ) }
              />
            </form>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}
