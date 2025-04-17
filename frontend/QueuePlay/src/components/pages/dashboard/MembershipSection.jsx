export const MembershipSection = () => {
    return (
        <>
            <script
                async
                src='https://js.stripe.com/v3/pricing-table.js'
            ></script>
            <stripe-pricing-table
                pricing-table-id='prctbl_1RF1MYBwG19OgdeMuv2kJybh'
                publishable-key='pk_test_51PRGvfBwG19OgdeMCj64NQmadrzq7VfsTxx6stl1VaD7UW6PeRVF0biJm1Ty2RuuZWYc10diVSWW8S0BEXEp7ef800IPnQfyMe'
            ></stripe-pricing-table>
        </>
    );
};
