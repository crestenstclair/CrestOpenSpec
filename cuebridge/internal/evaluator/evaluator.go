package evaluator

import (
	"fmt"

	"cuelang.org/go/cue"
	"cuelang.org/go/cue/cuecontext"
	"cuelang.org/go/cue/load"
)

// Project evaluates one CUE package rooted at dir and returns the concrete
// project value as JSON. The bytes are intended for an in-memory caller; this
// package does not write an export or maintain any persistent state.
func Project(dir string) ([]byte, error) {
	ctx := cuecontext.New()
	value, err := buildPackage(ctx, dir, "_")
	if err != nil {
		value, err = buildPackage(ctx, dir, "")
		if err != nil {
			return nil, fmt.Errorf("load CUE package: %w", err)
		}
	}

	project := value.LookupPath(cue.ParsePath("project"))
	if err := project.Err(); err != nil {
		return nil, fmt.Errorf("resolve project: %w", err)
	}

	encoded, err := project.MarshalJSON()
	if err != nil {
		return nil, fmt.Errorf("render concrete project: %w", err)
	}
	return encoded, nil
}

func buildPackage(ctx *cue.Context, dir, packageName string) (cue.Value, error) {
	config := &load.Config{Dir: dir}
	if packageName != "" {
		config.Package = packageName
	}

	instances := load.Instances(nil, config)
	if len(instances) == 0 {
		return cue.Value{}, fmt.Errorf("no CUE package found in %s", dir)
	}

	value := ctx.BuildInstance(instances[0])
	if err := value.Err(); err != nil {
		return cue.Value{}, err
	}
	return value, nil
}
