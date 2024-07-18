import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";

export default function Terms() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Link className="absolute top-4 left-4" href="/">
        <Button color="primary" size="sm" variant="flat">
          Back
        </Button>
      </Link>

      <h2 className="text-2xl font-bold">Terms of Use</h2>

      <p className="text-gray-500">1. Acceptance of Terms</p>
      <p className="text-gray-500 text-sm">
        By accessing and using our site, you agree to comply with and be bound
        by the following Terms of Use. If you do not agree with any part of
        these terms, you should not use our site.
      </p>

      <p className="text-gray-500">2. Service Description</p>
      <p className="text-gray-500 text-sm">
        Our site offers a tool that allows users to download trailers from
        streaming sites such as Apple TV, Prime Video, and Netflix. It is
        important to note that our site does not host any video content; it
        merely facilitates access to publicly available trailers from these
        services. The trailers can be viewed on external pages of the respective
        streaming services.
      </p>

      <p className="text-gray-500">3. Use of the Service</p>
      <p className="text-gray-500 text-sm">
        3.1 You agree to use the site only for lawful purposes and in accordance
        with these Terms of Use.
      </p>
      <p className="text-gray-500 text-sm">
        3.2 You must not use the site in a way that could damage, disable,
        overburden, or impair the site or interfere with any other party’s use
        of the site.
      </p>
      <p className="text-gray-500 text-sm">
        3.3 You must not attempt to gain unauthorized access to any part of the
        site.
      </p>
      <p className="text-gray-500 text-sm">
        3.4 Trailers downloaded through our site are for personal and
        non-commercial use only. You may not reproduce, distribute, modify,
        create derivative works from, publicly display, or otherwise use the
        trailers for commercial purposes without permission from the copyright
        holders.
      </p>

      <p className="text-gray-500">4. Intellectual Property</p>
      <p className="text-gray-500 text-sm">
        All content, including but not limited to text, graphics, logos, button
        icons, images, audio clips, and software, is the property of the site or
        its content suppliers and is protected by international copyright laws.
      </p>

      <p className="text-gray-500">5. Limitation of Liability</p>
      <p className="text-gray-500 text-sm">
        Our site is not responsible for any direct, indirect, incidental,
        special, or consequential damages resulting from the use or inability to
        use our service. This includes, but is not limited to, reliance on any
        information obtained through the service or that results from errors,
        omissions, interruptions, deletion of files or emails, defects, viruses,
        delays in operation or transmission, or any failure of performance.
      </p>

      <p className="text-gray-500">6. Modifications to the Terms of Use</p>
      <p className="text-gray-500 text-sm">
        We reserve the right to modify these Terms of Use at any time. You are
        responsible for regularly reviewing these terms. Continued use of the
        site after any changes constitutes your acceptance of the new Terms of
        Use.
      </p>

      <h2 className="text-2xl font-bold mt-4">Privacy Policy</h2>

      <p className="text-gray-500">1. Information We Collect</p>
      <p className="text-gray-500 text-sm">
        Our site collects only the minimal information necessary for the
        functioning of the service, including but not limited to:
      </p>
      <ul className="list-disc list-inside text-gray-500 text-sm">
        <li>IP address</li>
        <li>Browser and device information</li>
        <li>Site usage data</li>
      </ul>

      <p className="text-gray-500">2. Use of Collected Information</p>
      <p className="text-gray-500 text-sm">
        The information collected is used to:
      </p>
      <ul className="list-disc list-inside text-gray-500 text-sm">
        <li>Improve the functioning of the site</li>
        <li>Ensure the security of the service</li>
        <li>Analyze site usage to enhance the user experience</li>
      </ul>

      <p className="text-gray-500">3. Sharing of Information</p>
      <p className="text-gray-500 text-sm">
        We do not share your personal information with third parties except when
        necessary to comply with the law or protect our rights.
      </p>

      <p className="text-gray-500">4. Cookies</p>
      <p className="text-gray-500 text-sm">
        Our site may use cookies to enhance the user experience. You may choose
        to disable cookies in your browser settings, but this may affect the
        functionality of the site.
      </p>

      <p className="text-gray-500">5. Information Security</p>
      <p className="text-gray-500 text-sm">
        We employ reasonable security measures to protect information against
        unauthorized access, alteration, disclosure, or destruction.
      </p>

      <p className="text-gray-500">6. User Rights</p>
      <p className="text-gray-500 text-sm">
        You have the right to access, correct, or delete your personal
        information that we hold. To exercise these rights, contact us via the
        email provided on our site.
      </p>

      <p className="text-gray-500">7. External Links</p>
      <p className="text-gray-500 text-sm">
        Our site may contain links to other sites. We are not responsible for
        the privacy practices or the content of these external sites.
      </p>

      <p className="text-gray-500">8. Changes to the Privacy Policy</p>
      <p className="text-gray-500 text-sm">
        We may update our Privacy Policy periodically. You are responsible for
        reviewing this policy regularly for any changes. Continued use of the
        site after changes are posted constitutes your acceptance of those
        changes.
      </p>

      <h2 className="text-2xl font-bold mt-4">
        Google AdSense Compliance Policy
      </h2>

      <p className="text-gray-500">1. Appropriate Content</p>
      <p className="text-gray-500 text-sm">
        Our site commits to maintaining a safe and appropriate environment for
        all users. We do not allow content that involves:
      </p>
      <ul className="list-disc list-inside text-gray-500 text-sm">
        <li>Violence or hate speech</li>
        <li>Discrimination of any kind</li>
        <li>Pornography or sexually explicit content</li>
        <li>Content promoting illegal activities</li>
      </ul>

      <p className="text-gray-500">2. Transparency with Users</p>
      <p className="text-gray-500 text-sm">
        We will maintain full transparency with users about data use and
        information collection, providing clear details about our Privacy Policy
        and Terms of Use.
      </p>

      <p className="text-gray-500">3. Responsive Ads</p>
      <p className="text-gray-500 text-sm">
        We will ensure that ads displayed on our site through Google AdSense are
        clearly identifiable as advertisements and do not interfere with the
        user experience.
      </p>

      <p className="text-gray-500">4. Data Protection</p>
      <p className="text-gray-500 text-sm">
        We will strictly comply with applicable data protection laws, including
        the General Data Protection Regulation (GDPR) in the European Union and
        the General Data Protection Law (LGPD) in Brazil.
      </p>

      <p className="text-gray-500">5. Violation Reporting</p>
      <p className="text-gray-500 text-sm">
        We will implement a system for users to report any content they consider
        inappropriate or in violation of our terms and policies, and we will
        take prompt action to address any issues.
      </p>

      <p className="text-gray-500">Contact</p>
      <p className="text-gray-500 text-sm">
        If you have any questions about these Terms of Use, the Privacy Policy,
        or the Google AdSense Compliance Policy, please contact us via the email
        provided on our site.
      </p>

      <h2 className="text-2xl font-bold mt-4">Contact</h2>

      <p className="text-gray-500 text-sm">
        If you have any questions about these Terms of Use, the Privacy Policy,
        or the Google AdSense Compliance Policy, please contact us via the email{" "}
        <Link className="text-sm" href="mailto:therystons@gmail.com">
          therystons@gmail.com
        </Link>{" "}
        provided on our site.
      </p>
    </div>
  );
}
