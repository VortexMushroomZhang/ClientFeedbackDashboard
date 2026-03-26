# Claude Code Instructions

## Project Context

This is an **Nx monorepo** workspace for Angular applications.

**Tech Stack:**
- Nx (Monorepo tooling)
- Angular (following Angular & Nx best practices)
- TypeScript
- SCSS for styling
- Angular Material (UI components)
- Vitest (Unit testing)
- Cypress (E2E testing)

**Workspace Structure:**
```
/
├── apps/                    # Application projects
│   ├── 
│   └── 
├── libs/                    # Shared libraries (reusable across apps)
│   ├── shared/
│   ├── feature-*/          # Feature libraries
│   └── environment-configuration/
├── tools/                   # Build tools and scripts
└── mock-server*/           # Mock API servers for development
```

## Nx Monorepo Best Practices

### Project Generation
- **Always use Nx generators** to create apps, libs, components, services
  ```bash
  nx g @nx/angular:app my-app
  nx g @nx/angular:lib my-lib
  nx g @nx/angular:component my-component --project=my-app
  nx g @nx/angular:service my-service --project=my-app
  ```
- Follow Nx naming conventions (kebab-case for projects and files)
- Use `--dry-run` flag to preview changes before generating

### Library Organization
- **Feature libraries**: Domain-specific features that can be lazy-loaded
- **UI libraries**: Presentational components (dumb components)
- **Data-access libraries**: Services, state management, API calls
- **Util libraries**: Pure utility functions and helpers

### Dependency Management
- Apps should only depend on libs, never on other apps
- Libs should have clear boundaries and minimal coupling
- Use Nx's `nx graph` to visualize project dependencies
- Avoid circular dependencies between libs

### Building & Testing
- Use Nx affected commands for efficient CI/CD:
  ```bash
  nx affected:test    # Test only affected projects
  nx affected:build   # Build only affected projects
  nx affected:lint    # Lint only affected projects
  ```
- Run specific project: `nx test private-app`, `nx build private-app`

## Angular Best Practices (for Nx Projects)

### Component Structure
- Use Angular CLI to generate components, services, and modules (`ng generate`)
- Follow the single responsibility principle - one component per file
- Keep components focused and small (< 400 lines)
- Use smart/container and dumb/presentational component patterns
- Place component-specific styles in component CSS files, not global styles

### TypeScript & Code Quality
- Enable strict mode in tsconfig.json
- Use strong typing - avoid `any` type
- Use interfaces for data models
- Use enums for constants
- Prefer `const` and `let` over `var`
- Use async/await over promise chains for readability

### Services & Dependency Injection
- Create services for business logic and data access
- Use dependency injection, don't instantiate services manually
- Make services `providedIn: 'root'` unless there's a specific reason not to
- Keep services focused on a single responsibility

### RxJS & Observables
- Unsubscribe from observables to prevent memory leaks (use `takeUntil`, `async` pipe, or `take`)
- Prefer the `async` pipe in templates over manual subscription
- Use RxJS operators for data transformation
- Avoid nested subscriptions - use higher-order operators like `switchMap`, `mergeMap`

### Templates & Data Binding
- Use Angular built-in directives (`*ngIf`, `*ngFor`, `*ngSwitch`)
- Use `trackBy` with `*ngFor` for performance
- Prefer property binding over attribute binding when possible
- Keep template logic simple - move complex logic to the component
- Use safe navigation operator (`?.`) to avoid null/undefined errors

### Routing
- Use lazy loading for feature modules
- Implement route guards for authentication/authorization
- Use resolver guards for pre-fetching data
- Define routes in a clear hierarchy

### State Management
- For simple state, use services with BehaviorSubjects
- For complex state, consider NgRx or other state management libraries
- Keep state immutable

### Testing
- Write unit tests for components, services, and pipes
- Use TestBed for component testing
- Mock dependencies in unit tests
- Test user interactions and component outputs
- Run tests after significant changes

### Performance
- Use OnPush change detection strategy when possible
- Lazy load modules to reduce initial bundle size
- Use Angular CDK virtual scrolling for large lists
- Optimize images and assets
- Use Angular production build for deployment

### File & Folder Structure
```
src/
├── app/
│   ├── core/          # Singleton services, guards, interceptors
│   ├── shared/        # Shared components, directives, pipes
│   ├── features/      # Feature modules (lazy-loaded)
│   └── models/        # TypeScript interfaces and types
```

## Code Refactoring

When separating or restructuring files:
1. First, map ALL shared state: services, dependencies, module imports
2. Create a dependency graph before moving any code
3. After separation, verify each module/component individually
4. Ensure proper imports and module declarations
5. Test all routing and data flow between components

## Testing & Verification

After any multi-file refactor or feature addition:
- Run `ng build` to verify no compilation errors
- Run `ng test` to ensure all tests pass
- Run `ng lint` to check code quality
- Test the application in the browser
- Verify routing and navigation work correctly

## Development Workflow

- Always commit working states before major refactors
- Break large refactors into incremental, verifiable steps
- Run tests after each significant change
- Use meaningful commit messages following conventional commits format

## Notes

- Avoid mixing concerns - keep components, services, and models separate
- Follow Angular style guide: https://angular.io/guide/styleguide
- Use Angular Material or PrimeNG for consistent UI components
- Document complex business logic with comments
