package app

import (
	"context"
	"errors"
	"fmt"
	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type App struct {
	h              *apphost.Host
	secret         string
	broker, engine int
	runtime        string
}

func New(h *apphost.Host) (apphost.Application, error) {
	exe, e := os.Executable()
	if e != nil {
		return nil, e
	}
	runtime := filepath.Join(filepath.Dir(exe), "remote-runtime")
	if p := os.Getenv("MY_REMOTE_RUNTIME"); p != "" {
		runtime = p
	}
	for _, p := range []string{"node.exe", "engine/server.cjs", "node_modules/meshcentral/meshcentral.js"} {
		if _, e = os.Stat(filepath.Join(runtime, p)); e != nil {
			return nil, fmt.Errorf("My Remote runtime is incomplete: %s", p)
		}
	}
	_, raw, _ := net.SplitHostPort(h.Config.Listen)
	port, _ := strconv.Atoi(raw)
	if port > 65300 {
		return nil, errors.New("listen port must leave room for two private services")
	}
	a := &App{h: h, secret: apphost.ID() + apphost.ID(), broker: port + 101, engine: port + 102, runtime: runtime}
	upstream, _ := url.Parse(fmt.Sprintf("http://127.0.0.1:%d", a.broker))
	proxy := httputil.NewSingleHostReverseProxy(upstream)
	proxy.Transport = &http.Transport{Proxy: nil, ResponseHeaderTimeout: 30 * time.Second}
	original := proxy.Director
	proxy.Director = func(r *http.Request) {
		original(r)
		for name := range r.Header {
			if strings.HasPrefix(strings.ToLower(name), "x-remote-") {
				r.Header.Del(name)
			}
		}
		r.Header.Del("Authorization")
		r.Header.Del("X-Meshauth")
		r.Header.Del("X-Forwarded-For")
		r.Header.Set("X-Remote-Broker", a.secret)
		if s := apphost.Current(r); s.User.Role == "owner" {
			r.Header.Set("X-Remote-Owner", s.User.ID)
			r.Header.Set("X-Remote-Expires", strconv.FormatInt(s.Expires.UnixMilli(), 10))
			if c, e := r.Cookie("remote_session"); e == nil {
				r.Header.Set("X-Remote-Session", apphost.Hash(c.Value))
			}
		}
		r.URL.Path = h.Base + r.URL.Path
	}
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, e error) {
		apphost.Problem(w, 503, "Remote desktop is starting. Try again shortly.")
	}
	public := func(w http.ResponseWriter, r *http.Request) {
		u, _ := url.Parse(h.Config.Origin)
		if r.Method != "GET" && r.Header.Get("Origin") != u.Scheme+"://"+u.Host {
			apphost.Problem(w, 403, "Open My Remote before submitting this request")
			return
		}
		proxy.ServeHTTP(w, r)
	}
	socket := func(w http.ResponseWriter, r *http.Request) {
		u, _ := url.Parse(h.Config.Origin)
		if r.Header.Get("Origin") != u.Scheme+"://"+u.Host {
			apphost.Problem(w, 403, "Invalid socket origin")
			return
		}
		if _, e := r.Cookie("remote_session"); e == nil {
			h.Owner(proxy.ServeHTTP)(w, r)
			return
		}
		if _, e := r.Cookie("remote_guest"); e == nil {
			proxy.ServeHTTP(w, r)
			return
		}
		apphost.Problem(w, 401, "Sign in or request support")
	}
	for _, method := range []string{"GET ", "POST "} {
		h.Mux.HandleFunc(method+"/api/remote/", h.Owner(proxy.ServeHTTP))
		h.Mux.HandleFunc(method+"/support-api/", public)
	}
	h.Mux.HandleFunc("GET /control.ashx", socket)
	h.Mux.HandleFunc("GET /meshrelay.ashx", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Has("browser") {
			socket(w, r)
		} else {
			proxy.ServeHTTP(w, r)
		}
	})
	h.Mux.Handle("GET /agent.ashx", proxy)
	return a, nil
}
func (a *App) Run(ctx context.Context) error {
	env := []string{"MY_REMOTE_DATA=" + a.h.Config.Data, "MY_REMOTE_ORIGIN=" + a.h.Config.Origin, "MY_REMOTE_SECRET=" + a.secret, "MY_REMOTE_ENGINE_PORT=" + strconv.Itoa(a.engine), "MY_REMOTE_BROKER_PORT=" + strconv.Itoa(a.broker), "NODE_ENV=production"}
	log, e := os.OpenFile(filepath.Join(a.h.Config.Data, "engine.log"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	if e != nil {
		return e
	}
	defer log.Close()
	return apphost.Service(ctx, filepath.Join(a.runtime, "node.exe"), a.h.Config.Data, []string{filepath.Join(a.runtime, "engine/server.cjs")}, env, io.Writer(log))
}
