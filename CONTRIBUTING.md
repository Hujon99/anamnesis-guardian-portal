# Contributing Guide

Thank you for your interest in contributing to the Optician Anamnesis System! This guide will help you get started with contributing code, reporting issues, and understanding our development workflow.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a code of professionalism and respect:
- Be respectful and constructive in all interactions
- Focus on what is best for the project and users
- Accept constructive criticism gracefully
- Report unacceptable behavior to project maintainers

## Getting Started

### Prerequisites
- Node.js 18+ (use nvm: `nvm use 18`)
- Git
- A GitHub account
- A Supabase account (for backend testing)
- A Clerk account (for auth testing)

### Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/optician-anamnesis.git
cd optician-anamnesis

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/optician-anamnesis.git

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase and Clerk credentials
```

### Local Development Setup

```bash
# Start development server
npm run dev

# In another terminal, start Supabase locally (optional)
supabase start
```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Update your fork
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/description-of-feature

# Or for bug fixes
git checkout -b fix/description-of-bug
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clear, self-documenting code
- Add comments for complex logic
- Follow existing code patterns
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run linter
npm run lint

# Build to check for type errors
npm run build

# Test manually in browser
npm run dev
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add support for multi-page forms"
```

See [Commit Message Guidelines](#commit-message-guidelines) below.

### 5. Push and Create PR

```bash
git push origin feature/description-of-feature
```

Then create a Pull Request on GitHub.

## Code Style Guidelines

### TypeScript

**Always use explicit types:**
```typescript
// ✅ Good
const fetchEntries = async (orgId: string): Promise<Entry[]> => {
  // ...
};

// ❌ Avoid
const fetchEntries = async (orgId) => {
  // ...
};
```

**Use interfaces for object types:**
```typescript
// ✅ Good
interface FormSubmissionProps {
  formId: string;
  onSubmit: (values: FormValues) => Promise<void>;
  isLoading: boolean;
}

// ❌ Avoid inline types
const FormSubmission: FC<{ formId: string; onSubmit: (values: any) => Promise<void>; isLoading: boolean }> = ...
```

**Avoid `any` - use `unknown` or proper types:**
```typescript
// ✅ Good
const parseJson = (data: unknown): FormData => {
  if (!isValidFormData(data)) {
    throw new Error('Invalid form data');
  }
  return data;
};

// ❌ Avoid
const parseJson = (data: any): any => {
  return data;
};
```

### React Components

**Functional components with TypeScript:**
```typescript
/**
 * FormSubmitButton handles form submission with loading state and validation.
 * It disables itself during submission and shows appropriate feedback.
 */
interface FormSubmitButtonProps {
  isSubmitting: boolean;
  isValid: boolean;
  onClick: () => void;
}

export const FormSubmitButton: FC<FormSubmitButtonProps> = ({
  isSubmitting,
  isValid,
  onClick
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={isSubmitting || !isValid}
      variant="primary"
    >
      {isSubmitting ? 'Skickar...' : 'Skicka in'}
    </Button>
  );
};
```

**Use custom hooks for logic:**
```typescript
// ✅ Good - Logic in hook
export const useFormSubmission = (formId: string) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ... logic
  return { submitForm, isSubmitting };
};

export const FormComponent = () => {
  const { submitForm, isSubmitting } = useFormSubmission(formId);
  return <Button onClick={submitForm} disabled={isSubmitting} />;
};

// ❌ Avoid - Logic in component
export const FormComponent = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitForm = async () => {
    setIsSubmitting(true);
    // ... 50 lines of logic
  };
  return <Button onClick={submitForm} />;
};
```

### Styling

**Use semantic design tokens:**
```typescript
// ✅ Good
<div className="bg-surface text-foreground border-border">

// ❌ Avoid direct colors
<div className="bg-white text-black border-gray-200">
```

**Use Tailwind utility classes:**
```typescript
// ✅ Good
<div className="flex items-center gap-4 p-6 rounded-lg shadow-sm">

// ❌ Avoid inline styles
<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
```

**Responsive design:**
```typescript
<div className="p-3 sm:p-4 md:p-6 text-sm sm:text-base">
```

### File Organization

**One component per file:**
```typescript
// ✅ Good: FormSubmitButton.tsx
export const FormSubmitButton = () => { /* ... */ };

// ❌ Avoid: FormComponents.tsx with multiple components
export const FormSubmitButton = () => { /* ... */ };
export const FormResetButton = () => { /* ... */ };
export const FormCancelButton = () => { /* ... */ };
```

**Group related files:**
```
src/components/PatientForm/
├── FormOrchestrator.tsx    # Main orchestrator
├── FormLayout.tsx          # Layout wrapper
├── FormFieldRenderer.tsx   # Field rendering logic
├── FormNavigation.tsx      # Navigation controls
└── index.ts                # Public exports
```

**Export via index files:**
```typescript
// src/components/PatientForm/index.ts
export { FormOrchestrator } from './FormOrchestrator';
export { FormLayout } from './FormLayout';
export type { FormOrchestratorProps } from './FormOrchestrator';
```

### File Headers

**Every file must have a descriptive header:**
```typescript
/**
 * This component orchestrates the patient form flow, managing state,
 * validation, and submission. It provides context to child components
 * and handles the coordination between form sections.
 * 
 * Key responsibilities:
 * - Initialize form state from template
 * - Coordinate multi-step navigation
 * - Handle form submission with retry logic
 * - Provide auto-save functionality
 */
```

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(forms): add conditional logic support for radio buttons

Implemented conditional show/hide logic based on radio button selections.
Questions can now be configured to appear only when specific options are selected.

Closes #123

---

fix(auth): resolve JWT token refresh issue on Safari

Safari was not properly caching tokens, causing unnecessary re-authentication.
Implemented localStorage fallback for token caching.

Fixes #456

---

docs(readme): update installation instructions

Added section on Supabase local development setup.

---

refactor(hooks): extract form validation into separate hook

Moved validation logic from FormOrchestrator to useFormValidation hook
for better reusability and testability.
```

### Commit Message Rules

1. Use present tense ("add feature" not "added feature")
2. Use imperative mood ("move cursor to..." not "moves cursor to...")
3. Keep subject line under 72 characters
4. Reference issues and PRs in footer
5. Explain *what* and *why*, not *how*

## Pull Request Process

### Before Creating PR

- [ ] Code follows style guidelines
- [ ] All tests pass locally
- [ ] New code has descriptive file headers
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran and how to reproduce them.

## Screenshots (if applicable)
Add screenshots to demonstrate UI changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have added file headers to new files
- [ ] I have updated documentation
- [ ] My changes generate no new warnings
- [ ] I have tested on multiple browsers (Chrome, Firefox, Safari)
```

### Review Process

1. **Automated Checks**: Linting, type checking, build
2. **Code Review**: At least one maintainer approval required
3. **Testing**: Manual testing by reviewers
4. **Merge**: Squash and merge to main

### Addressing Review Comments

```bash
# Make changes based on feedback
git add .
git commit -m "refactor: address PR review comments"
git push origin feature/your-feature
```

## Testing Requirements

### Manual Testing Checklist

For every PR, test:

- [ ] Desktop Chrome (latest)
- [ ] Desktop Firefox (latest)
- [ ] Desktop Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)
- [ ] Responsive breakpoints (sm, md, lg, xl)

### Testing Forms

When modifying form components:

- [ ] Test all question types
- [ ] Test conditional logic
- [ ] Test validation (required fields, formats)
- [ ] Test submission (success and error states)
- [ ] Test auto-save functionality
- [ ] Test token expiration handling

### Testing Kiosk Mode

- [ ] Test on actual iPad if possible
- [ ] Verify touch targets are large enough (min 44px)
- [ ] Test auto-reset after submission
- [ ] Test session persistence

### Testing Real-time Features

- [ ] Open two browser windows (different users)
- [ ] Make changes in one window
- [ ] Verify changes appear in other window
- [ ] Check for race conditions

## Documentation

### When to Update Documentation

Update docs when you:
- Add a new feature
- Change user-facing behavior
- Modify API contracts
- Add new configuration options
- Change deployment process

### Documentation Files

- **README.md**: High-level overview and setup
- **ARCHITECTURE.md**: Deep dive into system design
- **FLOWS.md**: User journey documentation
- **This file (CONTRIBUTING.md)**: Contribution guidelines
- **JSDoc comments**: In-code documentation

### JSDoc Comments

Add JSDoc for:
- All exported functions
- Complex algorithms
- Public API functions

```typescript
/**
 * Validates a form submission token and returns the associated entry.
 * 
 * @param token - The access token from the form URL
 * @returns The anamnes entry if valid, null otherwise
 * @throws {TokenExpiredError} If the token has expired
 * @throws {TokenInvalidError} If the token doesn't exist
 * 
 * @example
 * ```typescript
 * const entry = await validateToken('abc-123-def');
 * if (entry) {
 *   // Process form submission
 * }
 * ```
 */
export const validateToken = async (token: string): Promise<Entry | null> => {
  // ...
};
```

## Questions?

- **Bug reports**: Create an issue with detailed reproduction steps
- **Feature requests**: Create an issue with use case description
- **General questions**: Ask in discussions or contact maintainers

Thank you for contributing! 🎉
