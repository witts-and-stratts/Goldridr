"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquareText,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin-ui/card";
import { Input } from "@/components/admin-ui/input";
import { Separator } from "@/components/admin-ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin-ui/table";
import { Textarea } from "@/components/ui/textarea";

interface SmsMessage {
  sid: string;
  accountSid: string | null;
  from: string;
  to: string;
  body: string;
  status: string;
  errorMessage: string | null;
  dateCreated: string;
  dateUpdated: string;
}

interface TestingDashboardProps {
  mailpitUrl: string;
  emailTransport: string;
  smsTransport: string;
}

function statusVariant( status: string ) {
  if ( status === "delivered" || status === "sent" ) return "default";
  if ( status === "failed" || status === "undelivered" ) return "destructive";
  return "outline";
}

export function TestingDashboard( { mailpitUrl, emailTransport, smsTransport }: TestingDashboardProps ) {
  const [ messages, setMessages ] = useState<SmsMessage[]>( [] );
  const [ loading, setLoading ] = useState( true );
  const [ sending, setSending ] = useState( false );
  const [ clearing, setClearing ] = useState( false );
  const [ testTo, setTestTo ] = useState( "+17135550123" );
  const [ testFrom, setTestFrom ] = useState( "+17135550000" );
  const [ testBody, setTestBody ] = useState( "Goldridr test SMS from the local mock." );

  const load = async () => {
    try {
      setLoading( true );
      const response = await fetch( "/api/admin/testing/sms?limit=50" );
      const data = await response.json();
      if ( data.success ) {
        setMessages( data.messages );
      } else {
        toast.error( data.error || "Failed to load mock SMS messages" );
      }
    } catch {
      toast.error( "Failed to load mock SMS messages" );
    } finally {
      setLoading( false );
    }
  };

  useEffect( () => {
    void load();
  }, [] );

  const sendMessage = async () => {
    try {
      setSending( true );
      const response = await fetch( "/api/admin/testing/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( {
          to: testTo,
          from: testFrom,
          body: testBody,
        } ),
      } );
      const data = await response.json();
      if ( !data.success ) {
        toast.error( data.error || "Failed to queue mock SMS" );
        return;
      }
      toast.success( "Mock SMS queued" );
      setMessages( current => [ data.message, ...current ] );
    } catch {
      toast.error( "Failed to queue mock SMS" );
    } finally {
      setSending( false );
    }
  };

  const updateStatus = async ( sid: string, status: string ) => {
    const response = await fetch( "/api/admin/testing/sms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify( { sid, status } ),
    } );
    const data = await response.json();
    if ( !data.success ) {
      toast.error( data.error || "Failed to update status" );
      return;
    }
    setMessages( current => current.map( item => item.sid === sid ? { ...item, status, dateUpdated: new Date().toISOString() } : item ) );
    toast.success( "Status updated" );
  };

  const clearMessages = async () => {
    try {
      setClearing( true );
      const response = await fetch( "/api/admin/testing/sms", { method: "DELETE" } );
      const data = await response.json();
      if ( !data.success ) {
        toast.error( data.error || "Failed to clear mock SMS" );
        return;
      }
      setMessages( [] );
      toast.success( "Mock SMS inbox cleared" );
    } catch {
      toast.error( "Failed to clear mock SMS" );
    } finally {
      setClearing( false );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Testing bench</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Mailpit and SMS mock tools</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Email delivery goes to Mailpit. SMS delivery can be routed to the local Twilio mock so you can exercise the entire notification flow without external spend.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={ load } disabled={ loading }>
            { loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" /> }
            Refresh
          </Button>
          <Button variant="destructive" onClick={ clearMessages } disabled={ clearing }>
            { clearing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" /> }
            Clear SMS
          </Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="size-4" />
                Mailpit
              </CardTitle>
              <CardDescription>Local SMTP inbox for email testing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Transport</p>
                <p className="mt-1 text-muted-foreground">{emailTransport}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Web UI</p>
                <a className="mt-1 inline-flex items-center gap-1 text-primary hover:underline" href={ mailpitUrl } target="_blank" rel="noreferrer">
                  {mailpitUrl}
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">SMTP</p>
                <p className="mt-1 text-muted-foreground">127.0.0.1:1025</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquareText className="size-4" />
                Twilio mock
              </CardTitle>
              <CardDescription>Queue fake SMS messages into PocketBase and inspect status changes here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Transport</p>
                <p className="mt-1 text-muted-foreground">{smsTransport}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">API</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">/api/admin/testing/sms</p>
              </div>
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">To</span>
                  <Input value={ testTo } onChange={ e => setTestTo( e.target.value ) } placeholder="+17135550123" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">From</span>
                  <Input value={ testFrom } onChange={ e => setTestFrom( e.target.value ) } placeholder="+17135550000" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">Body</span>
                  <Textarea value={ testBody } onChange={ e => setTestBody( e.target.value ) } rows={ 5 } />
                </label>
                <Button onClick={ sendMessage } disabled={ sending }>
                  { sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" /> }
                  Queue mock SMS
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Mock SMS inbox</CardTitle>
            <CardDescription>Messages created by the worker or sent through the test form.</CardDescription>
          </CardHeader>
          <Separator />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              { loading ? (
                <TableRow>
                  <TableCell colSpan={ 5 }>
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading messages
                    </div>
                  </TableCell>
                </TableRow>
              ) : messages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={ 5 }>
                    <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                      <AlertTriangle className="size-6" />
                      <p className="text-sm font-medium">No mock SMS yet</p>
                      <p className="max-w-sm text-xs">Queue a test SMS or run the notification worker in mock mode to populate this table.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : messages.map( message => (
                <TableRow key={ message.sid }>
                  <TableCell>
                    <Badge variant={ statusVariant( message.status ) } className="gap-1">
                      { message.status === "delivered" ? <Check className="size-3" /> : null }
                      { message.status }
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{ message.to }</TableCell>
                  <TableCell className="max-w-[28rem] truncate">{ message.body }</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{ new Date( message.dateCreated ).toLocaleString() }</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={ () => updateStatus( message.sid, "delivered" ) }>Mark delivered</Button>
                      <Button size="sm" variant="outline" onClick={ () => updateStatus( message.sid, "failed" ) }>Mark failed</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) ) }
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
