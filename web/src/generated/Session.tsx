// Generated from screens/Session.aui; edit the AUI source.
import { Badge, Button, Checkbox, Divider, Field, Heading, Icon, Input, Page, Row, Section, Select, Spacer, Stack, Text } from "@/components/ui"

export function Session({ data, onAction }: { data: any; onAction: (name: string) => void }) {
  return (
    <Page>
      <Row variant="session-header">
        <Icon name="Monitor" size={21} />
        <Heading level={1}>{data.name}</Heading>
        <Badge tone={data.tone}>{data.status}</Badge>
        <Spacer />
        <Button onClick={() => onAction("options")} variant="text">Session options</Button>
        <Button onClick={() => onAction("disconnect")} variant="disconnect">Disconnect</Button>
      </Row>
      <Row variant="session-layout">
        <Section id="desktop-canvas" />
        {data.options && (
          <Stack variant="session-options">
            <Heading level={2}>Session options</Heading>
            <Button onClick={() => onAction("fullscreen")} variant="tonal">
              <Icon name="Maximize" />
              <Text>Full screen</Text>
            </Button>
            <Checkbox name="fit" label="Scale to fit" />
            <Checkbox name="viewOnly" label="View only" />
            <Text variant="muted">Showing all connected displays</Text>
            <Field label="Picture quality"><Select name="quality" options={data.qualities} /></Field>
            <Divider />
            <Heading level={3}>Keyboard</Heading>
            <Text variant="muted">Ctrl + Alt + Delete requires a Windows service host.</Text>
            <Button onClick={() => onAction("escape")} variant="tonal">Send Escape</Button>
            <Button onClick={() => onAction("winkey")} variant="tonal">Send Windows key</Button>
            <Divider />
            <Heading level={3}>Clipboard</Heading>
            <Text variant="muted">Clipboard is shared only when you choose an action.</Text>
            <Field label="Text to send"><Input name="clipboard" multiline={true} /></Field>
            <Button onClick={() => onAction("sendClipboard")} variant="tonal">Send to computer</Button>
            <Button onClick={() => onAction("getClipboard")} variant="tonal" disabled={data.guest}>Get from computer</Button>
            <Divider />
            <Text variant="muted">{data.notice}</Text>
            <Text variant="muted">Powered by TightVNC and noVNC</Text>
          </Stack>
        )}
      </Row>
    </Page>
  )
}
