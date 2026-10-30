package app

import (
	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
	"net/http/httptest"
	"testing"
)

func TestManagerRevocationBoundary(t *testing.T) {
	c := apphost.Config{Origin: "https://workspace.example.test/remote", Issuer: "https://accounts.example.test", WorkspaceURL: "https://workspace.example.test", ClientSecret: "synthetic-manager-secret"}
	for _, tc := range []struct {
		remote, origin, auth string
		want                 bool
	}{
		{"127.0.0.1:1234", "https://workspace.example.test", "Bearer synthetic-manager-secret", true},
		{"192.0.2.1:1234", "https://workspace.example.test", "Bearer synthetic-manager-secret", false},
		{"127.0.0.1:1234", "https://invalid.example", "Bearer synthetic-manager-secret", false},
		{"127.0.0.1:1234", "https://workspace.example.test", "Bearer wrong", false},
		{"127.0.0.1:1234", "https://workspace.example.test", "", false},
	} {
		r := httptest.NewRequest("POST", "http://localhost/_integration/revoke-owner-sessions", nil)
		r.RemoteAddr = tc.remote
		r.Header.Set("Origin", tc.origin)
		r.Header.Set("Authorization", tc.auth)
		if managerAllowed(c, r) != tc.want {
			t.Fatal(tc)
		}
	}
	c.Issuer = ""
	r := httptest.NewRequest("POST", "http://localhost/", nil)
	r.RemoteAddr = "127.0.0.1:1234"
	r.Header.Set("Origin", "https://workspace.example.test")
	r.Header.Set("Authorization", "Bearer synthetic-manager-secret")
	if managerAllowed(c, r) {
		t.Fatal("standalone manager route enabled")
	}
}
