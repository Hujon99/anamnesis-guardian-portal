import React from 'react';
import { useRouter } from 'next/router';
import OpticianFormContainer from '@/components/Optician/OpticianFormContainer';
import { useFormTemplate } from '@/hooks/useFormTemplate'; // Assuming you load the template
// REMOVED: import { useOpticianFormSubmission } from '@/hooks/useOpticianFormSubmission';

const OpticianFormPage = () => {
    const router = useRouter();
    const { token } = router.query as { token: string };
    const { formTemplate, isLoading: isLoadingTemplate, error: templateError } = useFormTemplate("standard"); // Or however you load it

    // REMOVED: const { handleFormSubmit, isSubmitting } = useOpticianFormSubmission(token);

    if (isLoadingTemplate) return <div>Laddar formulär...</div>;
    if (templateError || !formTemplate) return <div>Kunde inte ladda formulär: {templateError?.message}</div>;
    if (!token) return <div>Token saknas.</div>; // Add check for token

    const handleSuccess = (/* submissionData */) => {
        // Optional: Redirect or show success message after OpticianFormContainer handles submission
        console.log("Submission successful, potentially redirecting...");
        // router.push('/optiker/dashboard'); // Example redirect
    };

    return (
        <div>
            <h1>Optiker Anamnes</h1>
            <OpticianFormContainer
                formTemplate={formTemplate}
                token={token} // Pass the token
                onSuccess={handleSuccess} // Optional success callback
                // REMOVED: onSubmit={handleFormSubmit}
                // REMOVED: isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default OpticianFormPage; 