package main

import (
	"fmt"
	"os"

	"github.com/crestenstclair/crestopenspec/cuebridge/internal/evaluator"
)

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintln(os.Stderr, "usage: crest-cue-bridge <spec-directory>")
		os.Exit(2)
	}

	project, err := evaluator.Project(os.Args[1])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if _, err := os.Stdout.Write(append(project, '\n')); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
