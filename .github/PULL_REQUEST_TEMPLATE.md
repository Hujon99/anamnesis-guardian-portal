## Description
<!-- Provide a brief description of the changes in this PR -->


## Type of Change
<!-- Mark the relevant option with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] 🎨 Style/UI changes
- [ ] ⚡ Performance improvement
- [ ] ✅ Test updates

## Related Issues
<!-- Link related issues using #issue_number -->

Closes #
Related to #

## Changes Made
<!-- List the specific changes made in this PR -->

- 
- 
- 

## How Has This Been Tested?
<!-- Describe the tests you ran and how to reproduce them -->

**Test Configuration:**
- Browser(s) tested:
- Device(s) tested:
- User role(s) tested:

**Test Steps:**
1. 
2. 
3. 

## Screenshots (if applicable)
<!-- Add screenshots to demonstrate UI changes -->

**Before:**


**After:**


## Checklist
<!-- Mark completed items with an "x" -->

### Code Quality
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have added file headers to new files explaining their purpose
- [ ] I have commented complex logic where necessary
- [ ] My changes generate no new ESLint warnings
- [ ] I have maintained type safety (no use of `any`)

### Testing
- [ ] I have tested on Chrome (desktop)
- [ ] I have tested on Firefox (desktop)
- [ ] I have tested on Safari (desktop)
- [ ] I have tested on mobile browsers (if UI changes)
- [ ] I have tested responsive breakpoints (if UI changes)
- [ ] I have tested with different user roles (if auth-related)
- [ ] I have tested error scenarios

### Documentation
- [ ] I have updated README.md (if needed)
- [ ] I have updated ARCHITECTURE.md (if architectural changes)
- [ ] I have updated FLOWS.md (if user flow changes)
- [ ] I have added/updated JSDoc comments for exported functions
- [ ] I have updated type definitions

### Database & Backend (if applicable)
- [ ] Database schema changes are backwards compatible
- [ ] I have tested RLS policies for my changes
- [ ] Edge function changes include proper error handling
- [ ] I have tested edge functions locally with Supabase CLI
- [ ] New secrets have been documented

### Accessibility & UX (if UI changes)
- [ ] Touch targets are at least 44x44px (for kiosk mode)
- [ ] Color contrast meets WCAG AA standards
- [ ] Keyboard navigation works properly
- [ ] Focus states are visible
- [ ] Loading states are implemented
- [ ] Error messages are user-friendly

### Security (if handling sensitive data)
- [ ] User input is properly validated
- [ ] No sensitive data is logged
- [ ] RLS policies protect new/modified tables
- [ ] Tokens and secrets are not exposed

## Additional Notes
<!-- Add any additional context, concerns, or discussion points -->


## Deployment Notes
<!-- Add any special deployment considerations -->

- [ ] Requires database migration
- [ ] Requires new environment variables
- [ ] Requires edge function deployment
- [ ] Requires cache clearing
- [ ] Other (describe):

---

**Reviewer Guidelines:**
- Verify all checklist items are addressed
- Test the changes locally if possible
- Check for potential security issues
- Ensure code follows project conventions
- Validate documentation updates
