package evaluator

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestProjectUnifiesPackageFiles(t *testing.T) {
	dir := t.TempDir()
	writeCue(t, dir, "project.cue", "package demo\nproject: {name: \"shop\", layers: [\"domain\"]}\n")
	writeCue(t, dir, "checkout.cue", "package demo\nproject: contexts: Checkout: purpose: \"owns checkout\"\n")

	encoded, err := Project(dir)
	if err != nil {
		t.Fatalf("Project() error = %v", err)
	}

	var project map[string]any
	if err := json.Unmarshal(encoded, &project); err != nil {
		t.Fatalf("unmarshal project: %v", err)
	}
	if project["name"] != "shop" {
		t.Fatalf("project name = %v, want shop", project["name"])
	}
	contexts := project["contexts"].(map[string]any)
	checkout := contexts["Checkout"].(map[string]any)
	if checkout["purpose"] != "owns checkout" {
		t.Fatalf("checkout purpose = %v", checkout["purpose"])
	}
}

func TestProjectRejectsConflictingPackage(t *testing.T) {
	dir := t.TempDir()
	writeCue(t, dir, "a.cue", "package demo\nproject: name: \"one\"\n")
	writeCue(t, dir, "b.cue", "package demo\nproject: name: \"two\"\n")

	if _, err := Project(dir); err == nil {
		t.Fatal("Project() error = nil, want conflict")
	}
}

func TestProjectRequiresConcreteProject(t *testing.T) {
	dir := t.TempDir()
	writeCue(t, dir, "project.cue", "package demo\nproject: name: string\n")

	if _, err := Project(dir); err == nil {
		t.Fatal("Project() error = nil, want incomplete value")
	}
}

func writeCue(t *testing.T, dir, name, content string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
}
