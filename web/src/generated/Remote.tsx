// Generated from screens/Remote.aui; edit the AUI source.
import { Alert, Badge, Button, Card, Checkbox, Field, Grid, Heading, Icon, Input, Link, Page, Row, Section, Select, Spacer, Spinner, Stack, Text } from "@/components/ui"

export function Remote({ data, onAction }: { data: any; onAction: (name: string) => void }) {
  return (
    <Page>
      <Row variant="header">
        <Row variant="brand">
          <Icon name="MonitorSmartphone" size={30} />
          <Heading level={1}>My Remote</Heading>
        </Row>
        <Spacer />
        <Link href={data.workspace} variant="apps">Apps</Link>
        <Button onClick={() => onAction("account")} variant="avatar" aria-label="Account">{data.initial}</Button>
      </Row>
      <Row variant="layout">
        <Stack variant="navigation">
          <Button onClick={() => onAction("access")} variant={data.accessVariant}>
            <Icon name="Monitor" />
            <Text>Remote Access</Text>
          </Button>
          <Button onClick={() => onAction("support")} variant={data.supportVariant}>
            <Icon name="Headphones" />
            <Text>Remote Support</Text>
          </Button>
          <Spacer />
          <Link href="https://github.com/oneworkspacestudio/my-remote" external={true}>About My Remote</Link>
        </Stack>
        <Stack variant="main">
          <Alert>{data.localNotice}</Alert>
          <Alert tone="error">{data.error}</Alert>
          <Alert>{data.notice}</Alert>
          {data.access ? (
            <Stack>
              <Row variant="page-heading">
                <Heading level={2}>Remote Access</Heading>
                <Spacer />
                <Button onClick={() => onAction("refresh")} variant="icon" aria-label="Refresh computers"><Icon name="RefreshCw" /></Button>
              </Row>
              <Card variant="hero">
                <Stack>
                  <Heading level={2}>Your computers, wherever you are</Heading>
                  <Text>Securely access your desktop from your phone, tablet or another computer.</Text>
                  {data.signedIn ? (
                    <Button onClick={() => onAction("setup")} variant="primary">Set up remote access</Button>
                  ) : (
                    <Link href={data.login} variant="primary">{data.loginLabel}</Link>
                  )}
                </Stack>
                <Section id="hero-art" />
              </Card>
              <Row variant="section-heading">
                <Heading level={3}>Remote devices</Heading>
                <Badge>{data.deviceCount}</Badge>
              </Row>
              {data.loading && (
                <Card>
                  <Spinner />
                  <Text>Connecting to your computers…</Text>
                </Card>
              )}
              {data.empty && (
                <Card variant="empty">
                  <Icon name="Laptop" size={42} />
                  <Heading level={3}>Your computers will appear here</Heading>
                  <Text>Set up a host on a computer you own, then connect whenever it is online.</Text>
                </Card>
              )}
              <Grid variant="devices">
                {data.devices.map((item, i) => (
                  <Card key={i} variant="device">
                    <Row>
                      <Icon name="Monitor" size={36} />
                      <Stack>
                        <Heading level={3}>{item.name}</Heading>
                        <Text variant="muted">{item.platform}</Text>
                      </Stack>
                      <Spacer />
                      <Button onClick={() => onAction("edit")} item={item.id} variant="icon" aria-label="Computer settings"><Icon name="Pencil" size={19} /></Button>
                    </Row>
                    <Row variant="device-footer">
                      <Badge tone={item.tone}>{item.status}</Badge>
                      <Spacer />
                      <Button onClick={() => onAction("connect")} item={item.id} variant="tonal" disabled={item.unavailable}>Connect</Button>
                    </Row>
                  </Card>
                ))}
              </Grid>
            </Stack>
          ) : (
            <Stack>
              <Heading level={2}>Remote Support</Heading>
              <Text variant="lead">Share your screen with someone you trust, or connect to help them.</Text>
              <Grid variant="support">
                <Card variant="support">
                  <Icon name="ScreenShare" size={42} />
                  <Heading level={3}>Get support</Heading>
                  <Text>Generate a one-time code. You decide who can connect, and you can stop sharing at any time.</Text>
                  {data.signedIn ? (
                    <Stack>
                      <Field label="Computer to share"><Select name="supportNode" options={data.deviceOptions} /></Field>
                      <Button onClick={() => onAction("generate")} variant="primary" disabled={data.empty}>Generate code</Button>
                    </Stack>
                  ) : (
                    <Link href={data.login} variant="primary">Sign in to share</Link>
                  )}
                  {data.code && (
                    <Stack variant="code">
                      <Text variant="code">{data.code}</Text>
                      <Text>Expires in 5 minutes. Share only with someone you trust.</Text>
                      <Button onClick={() => onAction("copycode")} variant="text">Copy code</Button>
                    </Stack>
                  )}
                </Card>
                <Card variant="support">
                  <Icon name="Headphones" size={42} />
                  <Heading level={3}>Give support</Heading>
                  <Text>Enter the code from the person who needs help. They’ll approve your request before you connect.</Text>
                  <Field label="Your name"><Input name="helperName" placeholder="Name shown to the host" autoComplete="name" /></Field>
                  <Field label="Access code"><Input name="accessCode" placeholder="000 000 000" inputMode="numeric" /></Field>
                  <Button onClick={() => onAction("redeem")} variant="primary">Connect</Button>
                  <Text variant="muted">{data.guestStatus}</Text>
                </Card>
              </Grid>
              {data.requests.map((item, i) => (
                <Card key={i}>
                  <Row>
                    <Icon name="UserRound" />
                    <Stack>
                      <Heading level={3}>{item.name}</Heading>
                      <Text>{item.description}</Text>
                    </Stack>
                    <Spacer />
                    <Button onClick={() => onAction("approve")} item={item.id} variant="primary" disabled={item.approved}>Share</Button>
                    <Button onClick={() => onAction("revoke")} item={item.id} variant="danger">Stop sharing</Button>
                  </Row>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Row>
      {data.modal && (
        <Card variant="dialog">
          <Row>
            <Heading level={2}>{data.modalTitle}</Heading>
            <Spacer />
            <Button onClick={() => onAction("close")} variant="icon" aria-label="Close dialog"><Icon name="X" /></Button>
          </Row>
          {data.setup && (
            <Stack>
              <Icon name="Download" size={42} />
              <Text>Enable access to this Windows PC while you are signed in. Choose a name and a PIN to connect.</Text>
              <Field label="Computer name"><Input name="setupName" placeholder="This PC" /></Field>
              <Field label="Access PIN"><Input name="setupPin" type="password" inputMode="numeric" placeholder="6–16 digits" /></Field>
              <Button onClick={() => onAction("enroll")} variant="primary">Enable remote access</Button>
              <Text variant="muted">Powered by TightVNC and noVNC. Access before Windows sign-in requires a service installation.</Text>
            </Stack>
          )}
          {data.edit && (
            <Stack>
              <Field label="Computer name"><Input name="deviceName" /></Field>
              <Field label="New access PIN"><Input name="newPin" type="password" placeholder="6–16 digits; leave blank to keep current PIN" inputMode="numeric" /></Field>
              <Checkbox name="deviceDisabled" label="Disable remote connections" />
              <Button onClick={() => onAction("saveDevice")} variant="primary">Save</Button>
            </Stack>
          )}
          {data.pin && (
            <Stack>
              <Icon name="LockKeyhole" size={40} />
              <Text>Enter this computer’s PIN to start an encrypted session.</Text>
              <Field label="Access PIN"><Input name="pin" type="password" inputMode="numeric" autoFocus={true} /></Field>
              <Button onClick={() => onAction("start")} variant="primary">Connect</Button>
            </Stack>
          )}
          {data.account && (
            <Stack>
              <Text>{data.accountName}</Text>
              <Text variant="muted">Remote access is available to the Workspace owner. Support guests receive temporary access to one computer.</Text>
              <Link href={data.logout}>Sign out</Link>
            </Stack>
          )}
          {data.localLogin && (
            <Stack>
              <Text>{data.loginHelp}</Text>
              <Field label="Email"><Input name="email" type="email" autoComplete="username" /></Field>
              <Field label="Password"><Input name="password" type="password" autoComplete="current-password" /></Field>
              <Button onClick={() => onAction("localLogin")} variant="primary">{data.loginButton}</Button>
            </Stack>
          )}
          <Alert tone="error">{data.modalError}</Alert>
        </Card>
      )}
    </Page>
  )
}
