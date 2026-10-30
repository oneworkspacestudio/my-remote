package main

import (
	"github.com/oneworkspacestudio/my-remote/internal/app"
	"github.com/oneworkspacestudio/my-remote/internal/webui"
	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
	"os"
)

var version = "0.1.0-preview.5"

func main() {
	if e := apphost.Main(apphost.Config{ID: "remote", Name: "My Remote", Version: version, Listen: "127.0.0.1:9034", Realtime: true}, webui.Files(), app.New); e != nil {
		apphost.Report(e)
		os.Exit(1)
	}
}
