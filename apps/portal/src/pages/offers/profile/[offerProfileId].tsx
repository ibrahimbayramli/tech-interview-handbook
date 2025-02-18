import Error from 'next/error';
import { useRouter } from 'next/router';
import { useState } from 'react';

import { ProfileDetailTab } from '~/components/offers/constants';
import ProfileComments from '~/components/offers/profile/ProfileComments';
import ProfileDetails from '~/components/offers/profile/ProfileDetails';
import ProfileHeader from '~/components/offers/profile/ProfileHeader';
import type {
  BackgroundDisplayData,
  OfferDisplayData,
} from '~/components/offers/types';

import { useToast } from '~/../../../packages/ui/dist';
import { convertMoneyToString } from '~/utils/offers/currency';
import { getProfilePath } from '~/utils/offers/link';
import { formatDate } from '~/utils/offers/time';
import { trpc } from '~/utils/trpc';

import type { Profile, ProfileAnalysis, ProfileOffer } from '~/types/offers';

export default function OfferProfile() {
  const { showToast } = useToast();
  const ErrorPage = (
    <Error statusCode={404} title="Requested profile does not exist." />
  );
  const router = useRouter();
  const { offerProfileId, token = '' } = router.query;
  const [isEditable, setIsEditable] = useState(false);
  const [background, setBackground] = useState<BackgroundDisplayData>();
  const [offers, setOffers] = useState<Array<OfferDisplayData>>([]);

  const [selectedTab, setSelectedTab] = useState<ProfileDetailTab>(
    ProfileDetailTab.OFFERS,
  );
  const [analysis, setAnalysis] = useState<ProfileAnalysis>();

  const getProfileQuery = trpc.useQuery(
    [
      'offers.profile.listOne',
      { profileId: offerProfileId as string, token: token as string },
    ],
    {
      enabled: typeof offerProfileId === 'string',
      onSuccess: (data: Profile) => {
        if (!data) {
          router.push('/offers');
        }
        // If the profile is not editable with a wrong token, redirect to the profile page
        if (!data?.isEditable && token !== '') {
          router.push(getProfilePath(offerProfileId as string));
        }

        setIsEditable(data?.isEditable ?? false);

        const filteredOffers: Array<OfferDisplayData> = data
          ? data?.offers.map((res: ProfileOffer) => {
              if (res.offersFullTime) {
                const filteredOffer: OfferDisplayData = {
                  base: convertMoneyToString(res.offersFullTime.baseSalary),
                  bonus: convertMoneyToString(res.offersFullTime.bonus),
                  companyName: res.company.name,
                  id: res.offersFullTime.id,
                  jobLevel: res.offersFullTime.level,
                  jobTitle: res.offersFullTime.title,
                  location: res.location,
                  negotiationStrategy: res.negotiationStrategy,
                  otherComment: res.comments,
                  receivedMonth: formatDate(res.monthYearReceived),
                  stocks: convertMoneyToString(res.offersFullTime.stocks),
                  totalCompensation: convertMoneyToString(
                    res.offersFullTime.totalCompensation,
                  ),
                };
                return filteredOffer;
              }
              const filteredOffer: OfferDisplayData = {
                companyName: res.company.name,
                id: res.offersIntern!.id,
                jobTitle: res.offersIntern!.title,
                location: res.location,
                monthlySalary: convertMoneyToString(
                  res.offersIntern!.monthlySalary,
                ),
                negotiationStrategy: res.negotiationStrategy,
                otherComment: res.comments,
                receivedMonth: formatDate(res.monthYearReceived),
              };
              return filteredOffer;
            })
          : [];
        setOffers(filteredOffers);

        if (data?.background) {
          const transformedBackground = {
            educations: data.background.educations.map((education) => ({
              endDate: education.endDate ? formatDate(education.endDate) : null,
              field: education.field,
              school: education.school,
              startDate: education.startDate
                ? formatDate(education.startDate)
                : null,
              type: education.type,
            })),
            experiences: data.background.experiences.map(
              (experience): OfferDisplayData => ({
                companyName: experience.company?.name,
                duration: experience.durationInMonths,
                jobLevel: experience.level,
                jobTitle: experience.title,
                monthlySalary: experience.monthlySalary
                  ? convertMoneyToString(experience.monthlySalary)
                  : null,
                totalCompensation: experience.totalCompensation
                  ? convertMoneyToString(experience.totalCompensation)
                  : null,
              }),
            ),
            profileName: data.profileName,
            specificYoes: data.background.specificYoes,
            totalYoe: data.background.totalYoe,
          };
          setBackground(transformedBackground);
        }

        if (data.analysis) {
          setAnalysis(data.analysis);
        }
      },
    },
  );

  const trpcContext = trpc.useContext();
  const deleteMutation = trpc.useMutation(['offers.profile.delete'], {
    onError: () => {
      showToast({
        title: `Error deleting offers profile.`,
        variant: 'failure',
      });
    },
    onSuccess: () => {
      trpcContext.invalidateQueries(['offers.profile.listOne']);
      router.push('/offers');
      showToast({
        title: `Offers profile successfully deleted!`,
        variant: 'success',
      });
    },
  });

  function handleDelete() {
    if (isEditable) {
      deleteMutation.mutate({
        profileId: offerProfileId as string,
        token: token as string,
      });
    }
  }

  return (
    <>
      {getProfileQuery.isError && ErrorPage}
      {!getProfileQuery.isError && (
        <div className="mb-4 flex flex h-screen w-screen items-center justify-center divide-x">
          <div className="h-full w-2/3 divide-y">
            <ProfileHeader
              background={background}
              handleDelete={handleDelete}
              isEditable={isEditable}
              isLoading={getProfileQuery.isLoading}
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
            />
            <div className="h-4/5 w-full overflow-y-scroll pb-32">
              <ProfileDetails
                analysis={analysis}
                background={background}
                isEditable={isEditable}
                isLoading={getProfileQuery.isLoading}
                offers={offers}
                profileId={offerProfileId as string}
                selectedTab={selectedTab}
              />
            </div>
          </div>
          <div className="h-full w-1/3 bg-white">
            <ProfileComments
              isDisabled={deleteMutation.isLoading}
              isEditable={isEditable}
              isLoading={getProfileQuery.isLoading}
              profileId={offerProfileId as string}
              profileName={background?.profileName}
              token={token as string}
            />
          </div>
        </div>
      )}
    </>
  );
}
