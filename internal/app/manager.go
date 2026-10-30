package app

import (
	"crypto/subtle"
	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
	"net"
	"net/http"
	"net/url"
	"strings"
)

// This revoke-only channel is for the local Workspace manager, never a browser.
func managerAllowed(c apphost.Config, r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	ip := net.ParseIP(host)
	origin, parseErr := url.Parse(c.Origin)
	auth := r.Header.Get("Authorization")
	return err == nil && ip != nil && ip.IsLoopback() && parseErr == nil && c.Issuer != "" && c.WorkspaceURL != "" && c.ClientSecret != "" && r.Header.Get("Origin") == origin.Scheme+"://"+origin.Host && strings.HasPrefix(auth, "Bearer ") && subtle.ConstantTimeCompare([]byte(strings.TrimPrefix(auth, "Bearer ")), []byte(c.ClientSecret)) == 1
}
